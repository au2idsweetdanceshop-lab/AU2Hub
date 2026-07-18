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
        const { data: existingOrder, error } = await supabase.from(targetTable).select('*').eq('id', order_id).maybeSingle();
        if (error || !existingOrder) return res.status(404).json({ success: false, status: 'ERROR', message: 'Pesanan tidak ditemukan' });
        const currentDbStatus = String(existingOrder.status).toUpperCase();
        if (['SUCCESS', 'SELESAI', 'PROSES', 'PAID'].includes(currentDbStatus)) {
            return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Sudah lunas di database' });
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
        let dataXoftware;
        try {
            dataXoftware = JSON.parse(textResponse);
        } catch (e) {
            return res.status(200).json({ success: true, status: 'PENDING', message: 'Provider Gateway error format' });
        }
        const statusXoftware = String(dataXoftware.status || dataXoftware.data?.status || '').toUpperCase();
        const paymentStatus = String(dataXoftware.payment_status || dataXoftware.data?.payment_status || '').toUpperCase();
        const statusTrans = String(dataXoftware.transaction_status || dataXoftware.data?.transaction_status || '').toUpperCase();
        if (
            statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || 
            paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS' ||
            statusTrans === 'SUCCESS' || statusTrans === 'SETTLED'
        ) {
            const productName = existingOrder.product_name || '';
            const userId = existingOrder.user_id;
            let nextStatus = 'SUCCESS';
            if (productName.startsWith('[DEPOSIT]') || productName.includes('[VIP]')) {
                nextStatus = 'selesai';
            }
            const { data: lockedOrder, error: lockError } = await supabase
                .from(targetTable)
                .update({ 
                    status: nextStatus,
                    waktu_selesai: nextStatus === 'selesai' && targetTable === 'orders_player' ? new Date().toISOString() : null
                })
                .eq('id', order_id)
                .eq('status', existingOrder.status)
                .select()
                .maybeSingle();
            if (lockError || !lockedOrder) {
                console.log(`⚠️ Jemput Bola dicegah! Pesanan ID: ${order_id} baru saja diproses oleh request lain.`);
                return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Diproses oleh webhook/request lain' });
            }
            if (productName.startsWith('[DEPOSIT]')) {
                const depositMatch = productName.match(/\[DEPOSIT\]\s*(\d+)/);
                if (!depositMatch) {
                    await supabase.from(targetTable).update({ status: 'PENDING' }).eq('id', order_id);
                    return res.status(400).json({ success: false, message: 'Format top up tidak valid' });
                }
                const amountToAdd = parseInt(depositMatch[1], 10);
                const { error: rpcError } = await supabase.rpc('tambah_saldo', {
                    p_user_id: userId,
                    p_jumlah: amountToAdd
                });
                if (rpcError) {
                    await supabase.from(targetTable).update({ status: 'PENDING' }).eq('id', order_id);
                    return res.status(500).json({ success: false, message: 'Gagal menambah saldo di DB' });
                }
                await supabase.from('wallet_transactions').insert({
                    user_id: userId,
                    amount: amountToAdd,
                    type: 'INCOME',
                    description: `Top Up Saldo via QRIS Otomatis (Ref: ${order_id.substring(0,8).toUpperCase()})`
                });
            }
            else if (productName.includes('[VIP]') && targetTable === 'orders') {
                const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();
                let waktuSekarang = new Date();
                let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();
                if (waktuExpired < waktuSekarang) waktuExpired = waktuSekarang;
                const matchBulan = productName.match(/(\d+)\s+Bulan/i);
                const matchHari = productName.match(/(\d+)\s+Hari/i);
                if (productName.includes('1 Tahun')) {
                    waktuExpired.setDate(waktuExpired.getDate() + 365);
                } else if (matchBulan) {
                    waktuExpired.setDate(waktuExpired.getDate() + (parseInt(matchBulan[1]) * 30));
                } else if (matchHari) {
                    waktuExpired.setDate(waktuExpired.getDate() + parseInt(matchHari[1]));
                } else {
                    waktuExpired.setDate(waktuExpired.getDate() + 30);
                }
                await supabase.from('profiles').update({ is_seller: true, seller_expired_at: waktuExpired.toISOString() }).eq('id', userId);
            }
            return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Lunas via Jemput Bola' });
        }
        if (statusXoftware === 'FAILED' || paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') {
            await supabase.from(targetTable).update({ status: 'DIBATALKAN' }).eq('id', order_id).eq('status', existingOrder.status);
            return res.status(200).json({ success: true, status: 'FAILED', message: 'Dibatalkan' });
        }
        return res.status(200).json({ success: true, status: 'PENDING', pesan_rahasia_xoftware: dataXoftware });
    } catch (error) {
        return res.status(500).json({ success: false, status: 'ERROR', message: error.message });
    }
}
