import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key agar punya akses 'Dewa' menembus RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // =================================================================
    // 🔥 WAJIB: MATIKAN CACHE VERCEL & BROWSER (ANTI GET 304)
    // =================================================================
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Endpoint ini melayani GET dari frontend app.js
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, table } = req.query;

    if (!order_id) {
        return res.status(400).json({ success: false, message: 'Missing order_id' });
    }

    const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';

    try {
        // =================================================================
        // 1. CEK DATABASE LOKAL DULU (Siapa tahu Webhook sempat masuk)
        // =================================================================
        const { data: existingOrder, error } = await supabase
            .from(targetTable)
            .select('status, product_name, user_id')
            .eq('id', order_id)
            .single();

        if (error || !existingOrder) {
            return res.status(404).json({ success: false, status: 'ERROR', message: 'Pesanan tidak ditemukan di database' });
        }

        const currentDbStatus = String(existingOrder.status).toUpperCase();

        if (currentDbStatus === 'SUCCESS' || currentDbStatus === 'SELESAI' || currentDbStatus === 'PROSES' || currentDbStatus === 'PAID') {
            return res.status(200).json({ 
                success: true, 
                status: 'SUCCESS', 
                message: 'Sudah lunas di database lokal' 
            });
        }

        // =================================================================
        // 2. JIKA LOKAL MASIH PENDING -> KITA JEMPUT BOLA KE API XOFTWARE!
        // =================================================================
        const baseUrl = process.env.XOFTWARE_BASE_URL;
        const apiKey = process.env.XOFTWARE_API_KEY;

        if (!baseUrl || !apiKey) {
            return res.status(200).json({ success: true, status: 'PENDING', message: 'API Key Xoftware belum disetting' });
        }

        // Susun Payload untuk Check Status Xoftware
        const payload = { ref_id: order_id };
        const payloadString = JSON.stringify(payload);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'POST';
        const path = '/v1/api/transactions/status';
        
        // Buat Tanda Tangan (Signature)
        const messageToSign = `${timestamp}\n${method}\n${path}\n${payloadString}`;
        const signature = crypto
            .createHmac('sha256', apiKey)
            .update(messageToSign, 'utf8')
            .digest('base64');

        // Tembak Server Xoftware
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
        let dataXoftware;
        try {
            dataXoftware = JSON.parse(textResponse);
        } catch (e) {
            console.error("Xoftware API Status Error (Not JSON):", textResponse);
            return res.status(200).json({ success: true, status: 'PENDING', message: 'Provider Gateway error format' });
        }

        const statusXoftware = dataXoftware.status ? String(dataXoftware.status).toUpperCase() : '';
        const paymentStatus = dataXoftware.payment_status ? String(dataXoftware.payment_status).toUpperCase() : '';

        console.log(`[JEMPUT BOLA] ID: ${order_id} | Status: ${statusXoftware} | Payment: ${paymentStatus}`);

        // =================================================================
        // 3. JIKA XOFTWARE BILANG LUNAS, KITA EKSEKUSI LAYAR HIJAU!
        // =================================================================
        if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || paymentStatus === 'SUCCEEDED' || paymentStatus === 'SUCCESS') {
            
            // Kita jadikan file check-status.js ini bertindak SEBAGAI Webhook!
            const productName = existingOrder.product_name || '';
            const userId = existingOrder.user_id;

            // Update Logika VIP Seller
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
                // Update Order Biasa / Auto Delivery
                await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
            }

            // Kembalikan SUCCESS ke frontend app.js agar Layar Hijau menyala!
            return res.status(200).json({ 
                success: true, 
                status: 'SUCCESS', 
                message: 'Jemput bola berhasil, pembayaran terkonfirmasi Lunas!' 
            });
        }

        // =================================================================
        // 4. JIKA XOFTWARE BILANG EXPIRED / GAGAL
        // =================================================================
        if (statusXoftware === 'FAILED' || paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') {
            await supabase.from(targetTable).update({ status: 'DIBATALKAN' }).eq('id', order_id);
            return res.status(200).json({ success: true, status: 'FAILED', message: 'Pesanan expired atau dibatalkan' });
        }

        // Jika Xoftware bilang memang belum lunas (REQUIRES_PAYMENT dll)
        return res.status(200).json({ 
            success: true, 
            status: 'PENDING', 
            message: 'Masih menunggu pembayaran dari user...' 
        });

    } catch (error) {
        console.error("🔥 Cek Status Error:", error.message);
        return res.status(500).json({ success: false, status: 'ERROR', message: error.message });
    }
}
