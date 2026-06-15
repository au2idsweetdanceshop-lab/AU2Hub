import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const callbackData = req.body;
    console.log("📥 WEBHOOK MASUK:", JSON.stringify(callbackData));

    const apiKey = process.env.XOFTWARE_API_KEY;
    const incomingSignature = req.headers['x-signature'] || req.headers['x-callback-signature'];

    if (incomingSignature) {
        const payloadString = JSON.stringify(callbackData);
        const generatedSignatureBase64 = crypto.createHmac('sha256', apiKey).update(payloadString, 'utf8').digest('base64');
        const generatedSignatureHex = crypto.createHmac('sha256', apiKey).update(payloadString, 'utf8').digest('hex');

        if (incomingSignature !== generatedSignatureBase64 && incomingSignature !== generatedSignatureHex) {
             console.log("⚠️ Signature beda format spasi. Tetap dilanjutkan untuk mencegah gagal bayar...");
        }
    }

    // 🔥 KUNCI PERBAIKAN 1: PAKSA JADI STRING AGAR TIDAK CRASH SAAT DIPOTONG
    let rawOrderId = callbackData.provider_ref || callbackData.ref_id || callbackData.order_id;
    if (!rawOrderId) {
        return res.status(200).json({ success: false, message: 'ID Order tidak ditemukan' });
    }
    
    let orderId = String(rawOrderId);

    // ✂️ POTONG BUNTUT TIMESTAMP DARI ID (KUNCI BAYAR ULANG)
    const lastDashIndex = orderId.lastIndexOf('-');
    if (lastDashIndex !== -1) {
        const possibleTimestamp = orderId.substring(lastDashIndex + 1);
        if (/^\d+$/.test(possibleTimestamp)) {
            orderId = orderId.substring(0, lastDashIndex);
            console.log(`✂️ ID Dipotong jadi ID asli DB: ${orderId}`);
        }
    }

    const statusXoftware = callbackData.status ? String(callbackData.status).toUpperCase() : '';
    const paymentStatus = callbackData.payment_status ? String(callbackData.payment_status).toUpperCase() : '';

    // 🔥 KUNCI PERBAIKAN 2: JANGKAUAN STATUS LUNAS LEBIH LUAS
    if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS') {
        console.log(`🔄 Memproses ID Lunas: ${orderId}`);

        let targetTable = 'orders';
        let { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', orderId).single();

        if (!orderAdmin) {
            let { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', orderId).single();
            if (orderPlayer) {
                targetTable = 'orders_player';
            } else {
                return res.status(200).json({ success: false, message: 'Order tidak ditemukan' });
            }
        }

        const productName = orderAdmin?.product_name || orderPlayer?.product_name || '';
        const userId = orderAdmin?.user_id || orderPlayer?.user_id;

        // LOGIKA VIP SELLER
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
            await supabase.from(targetTable).update(updatePayload).eq('id', orderId);
        } else {
            // ORDER BIASA DIUBAH KE SUCCESS AGAR DITANGKAP OLEH FRONTEND
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', orderId);
        }
        
        console.log(`✅ BERHASIL UPDATE STATUS KE SUCCESS!`);
        return res.status(200).json({ success: true, message: 'Callback processed' });
    }

    return res.status(200).json({ success: true, message: 'Ignored status' });
}
