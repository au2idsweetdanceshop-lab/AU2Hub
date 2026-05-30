import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key agar punya akses 'Dewa' menembus RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    console.log("📥 WEBHOOK MASUK DARI XOFTWARE:", JSON.stringify(req.body, null, 2));

    // ==========================================
    // 🛡️ VERIFIKASI SIGNATURE (AKTIF PENUH)
    // ==========================================
    const apiKey = process.env.XOFTWARE_API_KEY; 
    const incomingSignature = req.headers['x-signature'] || req.headers['x-callback-signature'];
    
    if (incomingSignature) {
        const payloadString = JSON.stringify(req.body);
        const generatedSignatureBase64 = crypto.createHmac('sha256', apiKey).update(payloadString, 'utf8').digest('base64');
        const generatedSignatureHex = crypto.createHmac('sha256', apiKey).update(payloadString, 'utf8').digest('hex');
        
        console.log(`🔐 Signature Masuk: ${incomingSignature}`);
        
        if (incomingSignature !== generatedSignatureBase64 && incomingSignature !== generatedSignatureHex) {
             console.error("❌ PERINGATAN: Signature Tidak Valid! Akses Ditolak.");
             // 🔥 PEMBLOKIR DIAKTIFKAN! Hacker langsung mental!
             return res.status(401).json({ success: false, message: 'Unauthorized: Invalid Signature' });
        } else {
             console.log("✅ Verifikasi Signature Sukses!");
        }
    } else {
        console.error("⚠️ PERINGATAN: Webhook masuk tanpa header Signature!");
        // 🔥 TOLAK MENTAH-MENTAH JIKA TANPA SIGNATURE
        return res.status(401).json({ success: false, message: 'Unauthorized: No Signature' });
    }
    // ==========================================

    const callbackData = req.body;
    const orderId = callbackData.provider_ref || callbackData.ref_id || callbackData.order_id; 

    if (!orderId) {
        return res.status(200).json({ success: false, message: 'ID Order tidak ditemukan' });
    }

    // Ambil status dari berbagai kemungkinan parameter Xoftware
    const statusXoftware = callbackData.status ? String(callbackData.status).toUpperCase() : '';
    const paymentStatus = callbackData.payment_status ? String(callbackData.payment_status).toUpperCase() : '';

    // 🔥 SETTLED SUDAH MASUK KAMUS
    if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED') {
        
        console.log(`🔄 Sedang memproses ID: ${orderId}...`);

        let orderData = null;
        let targetTable = 'orders';

        let { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', orderId).single();
        
        if (orderAdmin) {
            orderData = orderAdmin;
        } else {
            let { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', orderId).single();
            if (orderPlayer) {
                orderData = orderPlayer;
                targetTable = 'orders_player';
            }
        }

        if (!orderData) {
            console.error(`❌ Order ID ${orderId} tidak ditemukan di database.`);
            return res.status(200).json({ success: false, message: 'Order tidak ditemukan' });
        }

        const productName = orderData.product_name || '';
        const userId = orderData.user_id;

        // ==========================================
        // 👑 LOGIKA VIP SELLER 
        // ==========================================
        if (productName.includes('[VIP]')) {
            console.log(`👑 Pembelian VIP terdeteksi untuk User: ${userId}`);

            const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();

            let waktuSekarang = new Date();
            let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();

            if (waktuExpired < waktuSekarang) {
                waktuExpired = waktuSekarang;
            }

            if (productName.includes('1 Tahun')) {
                waktuExpired.setDate(waktuExpired.getDate() + 365);
            } else {
                const match = productName.match(/(\d+)\s+Bulan/i);
                if (match) {
                    const jumlahBulan = parseInt(match[1]);
                    waktuExpired.setDate(waktuExpired.getDate() + (jumlahBulan * 30));
                } else {
                    waktuExpired.setDate(waktuExpired.getDate() + 30); 
                }
            }

            const { error: profileErr } = await supabase.from('profiles')
                .update({ 
                    is_seller: true, 
                    seller_expired_at: waktuExpired.toISOString() 
                })
                .eq('id', userId);

            if (profileErr) {
                console.error("❌ Gagal update status VIP:", profileErr);
            } else {
                console.log(`✅ Profil ${userId} sukses diupdate jadi VIP sampai ${waktuExpired.toISOString()}`);
            }

            // 🔥 PERBAIKAN: HINDARI ERROR KOLOM waktu_selesai DI TABEL ADMIN
            let updatePayload = { status: 'selesai' };
            
            // Cuma masukin waktu_selesai kalau yang diurus itu tabel Pasar Player
            if (targetTable === 'orders_player') {
                updatePayload.waktu_selesai = new Date().toISOString();
            }

            await supabase.from(targetTable)
                .update(updatePayload)
                .eq('id', orderId);

        } else {
            // ORDER BIASA
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', orderId);
        }
        
        console.log(`✅ BERHASIL! Proses Webhook selesai untuk Order ${orderId}.`);
        return res.status(200).json({ success: true, message: 'Callback received and processed' });
    }

    console.log(`ℹ️ Status diabaikan karena belum lunas: ${statusXoftware} / ${paymentStatus}`);
    return res.status(200).json({ success: true, message: 'Ignored status' });
}
