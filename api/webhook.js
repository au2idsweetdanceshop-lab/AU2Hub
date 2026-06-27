import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const payload = req.body;
        console.log("📥 WEBHOOK MASUK FULL PAYLOAD:", JSON.stringify(payload));

        const dataCore = payload.data || payload;
        let rawOrderId = dataCore.provider_ref || dataCore.ref_id || dataCore.order_id || payload.ref_id || payload.order_id;
        
        if (!rawOrderId) {
            console.error("❌ Gagal: Tidak ada ID Order di dalam Webhook.");
            return res.status(400).json({ success: false, message: 'ID Order tidak ditemukan' });
        }

        const orderId = String(rawOrderId);

        const statusXoftware = dataCore.status ? String(dataCore.status).toUpperCase() : '';
        const paymentStatus = dataCore.payment_status ? String(dataCore.payment_status).toUpperCase() : '';
        const statusTrans = dataCore.transaction_status ? String(dataCore.transaction_status).toUpperCase() : '';

        // Jika Transaksi Lunas
        if (
            statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || 
            paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS' ||
            statusTrans === 'SUCCESS' || statusTrans === 'SETTLED'
        ) {
            console.log(`🔄 Memproses ID Lunas: ${orderId}`);

            let targetTable = 'orders';
            let orderData = null;

            const { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', orderId).single();
            if (orderAdmin) {
                orderData = orderAdmin;
                targetTable = 'orders';
            } else {
                const { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', orderId).single();
                if (orderPlayer) {
                    orderData = orderPlayer;
                    targetTable = 'orders_player';
                }
            }

            if (!orderData) {
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan di DB' });
            }

            const currentDbStatus = String(orderData.status).toUpperCase();
            const productName = orderData.product_name || '';
            const userId = orderData.user_id;
            const pricePaid = Number(orderData.price);

            // ========================================================
            // 🛡️ REVISI ANTI-BENTROK (RACE CONDITION PROTECTOR)
            // ========================================================
            let isAlreadyProcessed = false;

            // Jika status DB sudah SUCCESS (Gara-gara disalip oleh check-status.js)
            if (['SUCCESS', 'SELESAI', 'PROSES', 'PAID'].includes(currentDbStatus)) {
                
                if (productName.startsWith('[DEPOSIT]')) {
                    // Jangan gampang percaya! Cek mutasi dompet.
                    // Jika riwayat uang masuk untuk Order ID ini sudah ada, baru kita anggap selesai.
                    const { data: existingTx } = await supabase.from('wallet_transactions')
                        .select('id')
                        .eq('description', `Top Up Saldo via QRIS Otomatis (Ref: ${orderId})`)
                        .maybeSingle();
                        
                    if (existingTx) isAlreadyProcessed = true;
                } 
                else if (productName.includes('[VIP]')) {
                    // Cek apakah waktu selesai sudah diisi (artinya sudah dieksekusi)
                    if (orderData.waktu_selesai) isAlreadyProcessed = true;
                } 
                else {
                    isAlreadyProcessed = true; // Untuk orderan barang biasa
                }

                // Jika memang benar-benar sudah dieksekusi sebelumnya, baru hentikan Webhook.
                if (isAlreadyProcessed) {
                    console.log(`⚠️ Order ${orderId} sudah diproses sepenuhnya. Mengabaikan webhook ganda.`);
                    return res.status(200).json({ success: true, message: 'Sudah diproses' });
                }
            }

            // ========================================================
            // 💰 JALUR 1: TOP UP SALDO OTOMATIS
            // ========================================================
            if (productName.startsWith('[DEPOSIT]')) {
                let amountToAdd = pricePaid; 
                const depositMatch = productName.match(/\[DEPOSIT\]\s*(\d+)/);
                if (depositMatch) {
                    amountToAdd = Number(depositMatch[1]);
                }

                console.log(`💰 Memproses Top Up Saldo User: ${userId} | Saldo Masuk: Rp ${amountToAdd} | Dibayar: Rp ${pricePaid}`);
                
                const { error: errSaldo } = await supabase.rpc('tambah_saldo', {
                    p_user_id: userId,
                    p_jumlah: amountToAdd
                });

                if (errSaldo) {
                    console.error("❌ Gagal menambah saldo via RPC:", errSaldo);
                    return res.status(500).json({ success: false, message: 'Database gagal memproses saldo' });
                }

                // Catat mutasi DENGAN REFERENSI ID agar jadi pelindung anti-dobel di masa depan
                await supabase.from('wallet_transactions').insert({
                    user_id: userId,
                    amount: amountToAdd,
                    type: 'INCOME',
                    description: `Top Up Saldo via QRIS Otomatis (Ref: ${orderId})`
                });

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
                if (waktuExpired < waktuSekarang) waktuExpired = waktuSekarang;

                if (productName.includes('1 Tahun')) {
                    waktuExpired.setDate(waktuExpired.getDate() + 365);
                } else {
                    const match = productName.match(/(\d+)\s+Bulan/i);
                    if (match) waktuExpired.setDate(waktuExpired.getDate() + (parseInt(match[1]) * 30));
                    else waktuExpired.setDate(waktuExpired.getDate() + 30);
                }

                await supabase.from('profiles').update({ 
                    is_seller: true, 
                    seller_expired_at: waktuExpired.toISOString() 
                }).eq('id', userId);
                
                let updatePayload = { status: 'selesai', waktu_selesai: new Date().toISOString() };
                await supabase.from(targetTable).update(updatePayload).eq('id', orderId);
                console.log(`✅ VIP Berhasil Diperpanjang untuk Order ${orderId}`);
            } 
            
            // ========================================================
            // 📦 JALUR 3: ORDER BIASA & PASAR PLAYER
            // ========================================================
            else {
                await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', orderId);
                console.log(`✅ Status DB Order Biasa/Barang diperbarui ke SUCCESS`);
            }
            
            return res.status(200).json({ success: true, message: 'Callback processed successfully' });
        }

        return res.status(200).json({ success: true, message: 'Ignored non-success status' });

    } catch (error) {
        console.error("🚨 Webhook Error Internal:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
