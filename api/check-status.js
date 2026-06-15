import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

    const { order_id, table } = req.query;
    if (!order_id) return res.status(400).json({ success: false, message: 'Missing order_id' });

    const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';

    try {
        const { data: existingOrder, error } = await supabase.from(targetTable).select('status, product_name, user_id').eq('id', order_id).single();
        if (error || !existingOrder) return res.status(404).json({ success: false, status: 'ERROR', message: 'Pesanan tidak ditemukan' });

        const currentDbStatus = String(existingOrder.status).toUpperCase();
        if (currentDbStatus === 'SUCCESS' || currentDbStatus === 'SELESAI' || currentDbStatus === 'PROSES' || currentDbStatus === 'PAID') {
            return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Sudah lunas' });
        }

        const baseUrl = process.env.XOFTWARE_BASE_URL;
        const apiKey = process.env.XOFTWARE_API_KEY;

        const payload = { ref_id: order_id };
        const payloadString = JSON.stringify(payload);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'POST';
        const path = '/v1/api/transactions/status';
        
        const messageToSign = `${timestamp}\n${method}\n${path}\n${payloadString}`;
        const signature = crypto.createHmac('sha256', apiKey).update(messageToSign, 'utf8').digest('base64');

        const response = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-Timestamp': timestamp,
                'X-Signature': signature
            },
            body: payloadString
        });

        const textResponse = await response.text();
        
        // 🔥 INI ADALAH PENYADAP RAHASIA KITA
        console.log(`[JAWABAN ASLI XOFTWARE] ID ${order_id}:`, textResponse);
        
        let dataXoftware;
        try {
            dataXoftware = JSON.parse(textResponse);
        } catch (e) {
            return res.status(200).json({ success: true, status: 'PENDING', message: 'Provider Gateway error format' });
        }

        // Antisipasi kalau data statusnya dibungkus berlapis-lapis
        const statusXoftware = String(dataXoftware.status || dataXoftware.data?.status || '').toUpperCase();
        const paymentStatus = String(dataXoftware.payment_status || dataXoftware.data?.payment_status || '').toUpperCase();

        if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || paymentStatus === 'SUCCEEDED' || paymentStatus === 'SUCCESS') {
            
            const productName = existingOrder.product_name || '';
            const userId = existingOrder.user_id;

            if (productName.includes('[VIP]')) {
                const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();
                let waktuSekarang = new Date();
                let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();
                if (waktuExpired < waktuSekarang) waktuExpired = waktuSekarang;

                if (productName.includes('1 Tahun')) waktuExpired.setDate(waktuExpired.getDate() + 365);
                else {
                    const match = productName.match(/(\d+)\s+Bulan/i);
                    if (match) waktuExpired.setDate(waktuExpired.getDate() + (parseInt(match[1]) * 30));
                    else waktuExpired.setDate(waktuExpired.getDate() + 30);
                }

                await supabase.from('profiles').update({ is_seller: true, seller_expired_at: waktuExpired.toISOString() }).eq('id', userId);
                let updatePayload = { status: 'selesai' };
                if (targetTable === 'orders_player') updatePayload.waktu_selesai = new Date().toISOString();
                await supabase.from(targetTable).update(updatePayload).eq('id', order_id);
            } else {
                await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
            }

            return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Lunas via Jemput Bola' });
        }

        if (statusXoftware === 'FAILED' || paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') {
            await supabase.from(targetTable).update({ status: 'DIBATALKAN' }).eq('id', order_id);
            return res.status(200).json({ success: true, status: 'FAILED', message: 'Dibatalkan' });
        }

        // Lempar balasan Xoftware ke Network Tab (Frontend) agar bisa Anda lihat
        return res.status(200).json({ 
            success: true, 
            status: 'PENDING', 
            pesan_rahasia_xoftware: dataXoftware 
        });

    } catch (error) {
        return res.status(500).json({ success: false, status: 'ERROR', message: error.message });
    }
}
