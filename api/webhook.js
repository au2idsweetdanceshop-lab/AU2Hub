import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase menggunakan Service Role Key (Bypass RLS untuk operasi Backend)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 1. Tolak semua akses browser biasa (Harus metode POST dari Payment Gateway)
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // ========================================================
    // 🛡️ VALIDASI KEAMANAN WEBHOOK (Opsional tapi Direkomendasikan)
    // ========================================================
    /*
    const callbackToken = req.headers['x-callback-token']; 
    if (callbackToken !== process.env.XOFTWARE_CALLBACK_TOKEN) {
        console.error("❌ Webhook ditolak: Token autentikasi tidak valid.");
        return res.status(401).send('Unauthorized');
    }
    */

    try {
        const payload = req.body;
        console.log("📥 WEBHOOK MASUK FULL PAYLOAD:", JSON.stringify(payload));

        // 2. Gali objek data (Mengatasi perbedaan format struktur JSON dari Xoftware)
        const dataCore = payload.data || payload;

        // 3. Tangkap ID Transaksi dari segala kemungkinan key
        let rawOrderId = dataCore.provider_ref || dataCore.ref_id || dataCore.order_id || payload.ref_id || payload.order_id;
        
        if (!rawOrderId) {
            console.error("❌ Gagal: Tidak ada ID Order di dalam Webhook.");
            return res.status(400).json({ success: false, message: 'ID Order tidak ditemukan' });
        }

        const orderId = String(rawOrderId);

        // 4. Tangkap Status Pembayaran
        const statusXoftware = dataCore.status ? String(dataCore.status).toUpperCase() : '';
        const paymentStatus = dataCore.payment_status ? String(dataCore.payment_status).toUpperCase() : '';
        const statusTrans = dataCore.transaction_status ? String(dataCore.transaction_status).toUpperCase() : '';

        console.log(`🔍 Memeriksa Status: status=${statusXoftware}, payment=${paymentStatus}, trans=${statusTrans}`);

        // 5. Eksekusi Jika Status LUNAS (Berhasil Dibayar)
        if (
            statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || 
            paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS' ||
            statusTrans === 'SUCCESS' || statusTrans === 'SETTLED'
        ) {
            console.log(`🔄 Memproses ID Lunas: ${orderId}`);

            let targetTable = 'orders';
            let orderData = null;

            // Cari Transaksi di Tabel 'orders' (Transaksi Admin/PPOB/VIP/Deposit)
            const { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', orderId).single();
            
            if (orderAdmin) {
                orderData = orderAdmin;
                targetTable = 'orders';
            } else {
                // Jika tidak ada di 'orders', cari di 'orders_player' (Pasar Player)
                const { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', orderId).single();
                if (orderPlayer) {
                    orderData = orderPlayer;
                    targetTable = 'orders_player';
                }
            }

            // Batalkan eksekusi jika ID benar-benar tidak terdaftar di database kita
            if (!orderData) {
                console.error(`❌ Gagal: Order ID ${orderId} tidak ditemukan di database.`);
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan di DB' });
            }

            // ========================================================
            // 🛡️ CEGAH RACE CONDITION (EKSEKUSI GANDA)
            // ========================================================
            const currentDbStatus = String(orderData.status).toUpperCase();
            if (['SUCCESS', 'SELESAI', 'PROSES', 'PAID'].includes(currentDbStatus)) {
                console.log(`⚠️ Order ${orderId} sudah berstatus ${currentDbStatus}. Mengabaikan webhook ganda.`);
                return res.status(200).json({ success: true, message: 'Sudah diproses sebelumnya' });
            }

            const productName = orderData.product_name || '';
            const userId = orderData.user_id;
            // Amankan format harga menjadi Number absolut
            const pricePaid = Number(orderData.price);

            // ========================================================
            // 💰 JALUR 1: TOP UP SALDO OTOMATIS
            // ========================================================
            if (productName.startsWith('[DEPOSIT]')) {
                // 🔥 SULAP PISAHKAN HARGA: Ekstrak nominal bersih dari nama produk (misal: "[DEPOSIT] 10000")
                let amountToAdd = pricePaid; 
                const depositMatch = productName.match(/\[DEPOSIT\]\s*(\d+)/);
                if (depositMatch) {
                    amountToAdd = Number(depositMatch[1]);
                }

                console.log(`💰 Memproses Top Up Saldo untuk User: ${userId} | Saldo Masuk: Rp ${amountToAdd} | Total Dibayar: Rp ${pricePaid}`);
                
                // A. Tambahkan saldo menggunakan RPC Supabase (HANYA nominal murni yang masuk)
                const { error: errSaldo } = await supabase.rpc('tambah_saldo', {
                    p_user_id: userId,
                    p_jumlah: amountToAdd
                });

                if (errSaldo) {
                    console.error("❌ Gagal menambah saldo via RPC:", errSaldo);
                    return res.status(500).json({ success: false, message: 'Database gagal memproses saldo' });
                }

                // B. Catat histori di Riwayat Mutasi Dompet (Sesuai nominal murni)
                await supabase.from('wallet_transactions').insert({
                    user_id: userId,
                    amount: amountToAdd,
                    type: 'INCOME',
                    description: 'Top Up Saldo via QRIS Otomatis'
                });

                // C. Selesaikan status order
                await supabase.from(targetTable).update({ status: 'selesai' }).eq('id', orderId);
                console.log(`✅ Top Up Berhasil untuk Order ${orderId}`);
            }
            
            // ========================================================
            // 👑 JALUR 2: PEMBELIAN VIP SELLER
            // ========================================================
            else if (productName.includes('[VIP]') && targetTable === 'orders') {
                console.log(`👑 Memproses Aktivasi VIP untuk User: ${userId}`);
                
                const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();
                
                let waktuSekarang = new Date();
                let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();
                
                // Jika masa aktif sebelumnya sudah mati, mulai hitung dari hari ini
                if (waktuExpired < waktuSekarang) waktuExpired = waktuSekarang;

                // Tambah masa aktif sesuai produk yang dibeli
                if (productName.includes('1 Tahun')) {
                    waktuExpired.setDate(waktuExpired.getDate() + 365);
                } else {
                    const match = productName.match(/(\d+)\s+Bulan/i);
                    if (match) waktuExpired.setDate(waktuExpired.getDate() + (parseInt(match[1]) * 30));
                    else waktuExpired.setDate(waktuExpired.getDate() + 30); // Default 30 Hari
                }

                // Update status VIP di tabel profil
                await supabase.from('profiles').update({ 
                    is_seller: true, 
                    seller_expired_at: waktuExpired.toISOString() 
                }).eq('id', userId);
                
                let updatePayload = { status: 'selesai' };
                if (targetTable === 'orders_player') updatePayload.waktu_selesai = new Date().toISOString();
                
                await supabase.from(targetTable).update(updatePayload).eq('id', orderId);
                console.log(`✅ VIP Berhasil Diperpanjang untuk Order ${orderId}`);
            } 
            
            // ========================================================
            // 📦 JALUR 3: ORDER BIASA & PASAR PLAYER (AUTO-DELIVERY)
            // ========================================================
            else {
                // Jangan diubah jadi "selesai", cukup "SUCCESS".
                // Nanti sistem Frontend app.js yang akan melanjutkan tugas Auto-Delivery-nya
                await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', orderId);
                console.log(`✅ Status DB Order Biasa/Barang diperbarui ke SUCCESS`);
            }
            
            return res.status(200).json({ success: true, message: 'Callback processed successfully' });
        }

        // Jika statusnya bukan Lunas (Pending, Gagal, Expired)
        console.log(`⚠️ Status belum lunas / Expired. Webhook diabaikan.`);
        return res.status(200).json({ success: true, message: 'Ignored non-success status' });

    } catch (error) {
        // Tangkap segala jenis error agar server tidak crash
        console.error("🚨 Webhook Error Internal:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
