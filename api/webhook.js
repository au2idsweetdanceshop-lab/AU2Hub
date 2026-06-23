import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Tolak semua akses browser biasa
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // ========================================================
    // 🛡️ PERBAIKAN BUG #3: VALIDASI KEAMANAN WEBHOOK 
    // ========================================================
    // Buka komentar di bawah jika Xoftware menggunakan Callback Token di headernya.
    // Pastikan kamu men-setting 'XOFTWARE_CALLBACK_TOKEN' di Environment Variables Vercel/Hosting-mu.
    /*
    const callbackToken = req.headers['x-callback-token']; 
    if (callbackToken !== process.env.XOFTWARE_CALLBACK_TOKEN) {
        console.log("❌ Webhook ditolak: Token autentikasi tidak valid.");
        return res.status(401).send('Unauthorized');
    }
    */

    const payload = req.body;
    console.log("📥 WEBHOOK MASUK FULL PAYLOAD:", JSON.stringify(payload));

    // 1. Gali objek data (Payment Gateway sering menyembunyikan data di dalam "data")
    const dataCore = payload.data || payload;

    // 2. Tangkap ID secara barbar dari segala kemungkinan
    let rawOrderId = dataCore.provider_ref || dataCore.ref_id || dataCore.order_id || payload.ref_id || payload.order_id;
    
    if (!rawOrderId) {
        console.log("❌ Gagal: Tidak ada ID Order di dalam Webhook.");
        return res.status(200).json({ success: false, message: 'ID Order tidak ditemukan' });
    }

    let orderId = String(rawOrderId);

    // 3. Tangkap Status dari segala jenis format yang mungkin dikirim Xoftware
    const statusXoftware = dataCore.status ? String(dataCore.status).toUpperCase() : '';
    const paymentStatus = dataCore.payment_status ? String(dataCore.payment_status).toUpperCase() : '';
    const statusTrans = dataCore.transaction_status ? String(dataCore.transaction_status).toUpperCase() : '';

    console.log(`🔍 Memeriksa Status: status=${statusXoftware}, payment=${paymentStatus}, trans=${statusTrans}`);

    // 4. Eksekusi Lunas
    if (
        statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || 
        paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS' ||
        statusTrans === 'SUCCESS' || statusTrans === 'SETTLED'
    ) {
        console.log(`🔄 Memproses ID Lunas: ${orderId}`);

        let targetTable = 'orders';
        let orderData = null;

        // 🔥 PERBAIKAN FATAL: Cari di orders dulu
        const { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', orderId).single();
        
        if (orderAdmin) {
            orderData = orderAdmin;
            targetTable = 'orders';
        } else {
            // Jika tidak ada di orders, cari di orders_player
            const { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', orderId).single();
            if (orderPlayer) {
                orderData = orderPlayer;
                targetTable = 'orders_player';
            }
        }

        // Jika di kedua tabel tidak ada
        if (!orderData) {
            console.log(`❌ Gagal: Order ID ${orderId} tidak ditemukan di database.`);
            return res.status(200).json({ success: false, message: 'Order tidak ditemukan di DB' });
        }

        // ========================================================
        // 🛡️ PERBAIKAN BUG #2: MENCEGAH RACE CONDITION (DOUBLE EXECUTION)
        // ========================================================
        const currentDbStatus = String(orderData.status).toUpperCase();
        if (['SUCCESS', 'SELESAI', 'PROSES', 'PAID'].includes(currentDbStatus)) {
            console.log(`⚠️ Order ${orderId} sudah berstatus ${currentDbStatus}. Mengabaikan webhook ganda.`);
            return res.status(200).json({ success: true, message: 'Sudah diproses sebelumnya' });
        }

        const productName = orderData.product_name || '';
        const userId = orderData.user_id;

        // ========================================================
        // 💰 TAMBAHAN BARU: DETEKSI TOP UP SALDO OTOMATIS
        // ========================================================
        if (productName.startsWith('[DEPOSIT]')) {
            console.log(`💰 Memproses Top Up Saldo untuk User: ${userId}, Nominal: ${orderData.price}`);
            
            // 1. Tambahkan saldo langsung ke dompet buyer
            const { error: errSaldo } = await supabase.rpc('tambah_saldo', {
                p_user_id: userId,
                p_jumlah: orderData.price
            });

            if (errSaldo) {
                console.error("❌ Gagal menambah saldo:", errSaldo);
                return res.status(500).json({ success: false, message: 'Gagal menambah saldo. Cek RPC Supabase.' });
            }

            // 2. Catat di Riwayat Mutasi Dompet
            await supabase.from('wallet_transactions').insert({
                user_id: userId,
                amount: orderData.price,
                type: 'INCOME',
                description: 'Top Up Saldo via QRIS Otomatis'
            });

            // 3. Ubah status pesanan menjadi selesai
            await supabase.from(targetTable).update({ status: 'selesai' }).eq('id', orderId);

            console.log(`✅ Top Up Berhasil. Saldo bertambah untuk Order ${orderId}`);
        }
        // ========================================================
        // 🛡️ PERBAIKAN BUG #1: MENCEGAH VIP PALSU (Cek targetTable)
        // ========================================================
        else if (productName.includes('[VIP]') && targetTable === 'orders') {
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
            
            console.log(`✅ VIP Berhasil Diperpanjang untuk Order ${orderId}`);
        } 
        // ========================================================
        // ORDER BIASA & PASAR PLAYER
        // ========================================================
        else {
            // ORDER BIASA & AUTO-DELIVERY DIUBAH KE SUCCESS
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', orderId);
            console.log(`✅ Status DB Order Biasa diperbarui ke SUCCESS`);
        }
        
        return res.status(200).json({ success: true, message: 'Callback processed successfully' });
    }

    console.log(`⚠️ Status belum lunas / diabaikan.`);
    return res.status(200).json({ success: true, message: 'Ignored status' });
}
