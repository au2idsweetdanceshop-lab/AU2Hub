import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const xoftwareApiKey = process.env.XOFTWARE_API_KEY;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
        const isDigiflazz = req.headers['x-hub-signature'] || (req.body && req.body.data && req.body.data.ref_id);

        // ==========================================
        // 1. WEBHOOK DIGIFLAZZ (PPOB & PENARIKAN)
        // ==========================================
        if (isDigiflazz) {
            console.log("🔔 [WEBHOOK] Menerima notifikasi dari Digiflazz (PPOB)");
            const payload = req.body;
            const dataPPOB = payload.data || payload;

            if (!dataPPOB.ref_id || !dataPPOB.status) {
                return res.status(400).json({ success: false, message: 'Payload Digiflazz tidak valid' });
            }

            // 1A. Ambil data order PPOB dari Supabase terlebih dahulu
            const { data: existingOrder, error: checkErr } = await supabase
                .from('riwayat_ppob')
                .select('status, user_id, sku_code, customer_no, price')
                .eq('ref_id', dataPPOB.ref_id)
                .single();

            if (checkErr || !existingOrder) {
                console.error("🚨 Order tidak ditemukan di DB.");
                return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
            }

            // Jika status sudah sama, hentikan proses (Mencegah webhook ganda/spam)
            if (existingOrder.status === dataPPOB.status) {
                return res.status(200).json({ success: true, message: 'Status sudah sesuai, diabaikan.' });
            }

            // 1B. Update status di Supabase
            const { error: updateErr } = await supabase
                .from('riwayat_ppob')
                .update({
                    status: dataPPOB.status,
                    sn: dataPPOB.sn || dataPPOB.message || 'Transaksi dibatalkan server'
                })
                .eq('ref_id', dataPPOB.ref_id);

            if (updateErr) {
                console.error("🚨 [WEBHOOK DIGIFLAZZ] Gagal update Supabase:", updateErr);
                return res.status(500).json({ success: false, message: 'Gagal update database' });
            }

            // 1C. LOGIKA AUTO-REFUND OTOMATIS (Jika Gagal)
            if (dataPPOB.status === 'Gagal') {
                console.log(`⚠️ Transaksi ${dataPPOB.ref_id} Gagal! Memproses Auto-Refund...`);
                
                // Tambah saldo kembali (Refund)
                await supabase.rpc('tambah_saldo', { 
                    p_user_id: existingOrder.user_id, 
                    p_jumlah: existingOrder.price 
                });
                
                // Catat refund di riwayat dompet
                const isWD = dataPPOB.ref_id.startsWith('WD_');
                const descText = isWD ? `Refund Tukar Saldo Gagal: ${existingOrder.sku_code}` : `Refund PPOB Gagal: ${existingOrder.sku_code}`;
                
                await supabase.from('wallet_transactions').insert({
                    user_id: existingOrder.user_id,
                    amount: existingOrder.price,
                    type: 'INCOME',
                    description: descText
                });
                
                // Kirim notifikasi sistem ke user
                await supabase.from('messages').insert({
                    sender_id: existingOrder.user_id, 
                    receiver_id: existingOrder.user_id,
                    message: `[SISTEM] Yah, transaksi *${existingOrder.sku_code}* tujuan *${existingOrder.customer_no}* GAGAL dari pusat.\n\nAlasan: ${dataPPOB.message || 'Gangguan Layanan'}\nDana sebesar Rp ${existingOrder.price.toLocaleString('id-ID')} telah dikembalikan ke saldo kamu secara otomatis!`
                });
            }

            // 1D. NOTIFIKASI JIKA SUKSES
            if (dataPPOB.status === 'Sukses') {
                const isWD = dataPPOB.ref_id.startsWith('WD_');
                const tipeTeks = isWD ? 'Tukar Saldo E-Wallet' : 'Pesanan PPOB';
                
                await supabase.from('messages').insert({
                    sender_id: existingOrder.user_id, 
                    receiver_id: existingOrder.user_id,
                    message: `[SISTEM] Hore! ${tipeTeks} *${existingOrder.sku_code}* tujuan *${existingOrder.customer_no}* SUKSES!\n\nSN/Catatan: ${dataPPOB.sn || 'Telah masuk'}`
                });
            }

            console.log(`✅ [WEBHOOK DIGIFLAZZ] Status PPOB ${dataPPOB.ref_id} diupdate ke: ${dataPPOB.status}`);
            return res.status(200).json({ success: true, message: 'Digiflazz diproses' });
        }


        // ==========================================
        // 2. WEBHOOK XOFTWARE (DEPOSIT & MITRA AU2HUB)
        // ==========================================
        const signatureHeader = req.headers['x-signature'];
        const timestampHeader = req.headers['x-timestamp'];

        if (!signatureHeader || !timestampHeader) {
            console.error("🚨 Webhook Ditolak: Header signature/timestamp hilang.");
            return res.status(401).json({ success: false, message: 'Unauthorized: Missing headers' });
        }

        const currentUnixTime = Math.floor(Date.now() / 1000);
        const requestTime = parseInt(timestampHeader, 10);
        if (Math.abs(currentUnixTime - requestTime) > 300) {
            console.error("🚨 Webhook Ditolak: Timestamp kadaluarsa (Potensi Replay Attack).");
            return res.status(401).json({ success: false, message: 'Unauthorized: Timestamp expired' });
        }

        const requestPath = '/api/webhook';
        const rawBody = req.body ? JSON.stringify(req.body) : "";
        const message = `${timestampHeader}\n${req.method}\n${requestPath}\n${rawBody}`;
        
        const expectedSignature = crypto
            .createHmac('sha256', xoftwareApiKey)
            .update(message, 'utf8')
            .digest('base64');
            
        const sigBuffer = Buffer.from(signatureHeader);
        const expectedBuffer = Buffer.from(expectedSignature);
        
        if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
            console.error("🚨 Webhook Ditolak: SIGNATURE TIDAK COCOK! (Serangan Spoofing Digagalkan)");
            return res.status(403).json({ success: false, message: 'Forbidden: Invalid signature' });
        }

        console.log("✅ [AMAN] Validasi Signature XoftwarePay Lolos!");
        const payload = req.body;
        const dataCore = payload.data || payload;
        let rawOrderId = dataCore.provider_ref || dataCore.ref_id || dataCore.order_id || payload.ref_id || payload.order_id;
        
        if (!rawOrderId) {
            return res.status(400).json({ success: false, message: 'ID Order tidak ditemukan' });
        }

        const orderId = String(rawOrderId);
        const statusXoftware = dataCore.status ? String(dataCore.status).toUpperCase() : '';
        const paymentStatus = dataCore.payment_status ? String(dataCore.payment_status).toUpperCase() : '';
        const statusTrans = dataCore.transaction_status ? String(dataCore.transaction_status).toUpperCase() : '';

        if (
            statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' ||
            paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS' ||
            statusTrans === 'SUCCESS' || statusTrans === 'SETTLED'
        ) {
            let targetTable = 'orders';
            let orderData = null;
            const { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
            if (orderAdmin) {
                orderData = orderAdmin;
            } else {
                const { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', orderId).maybeSingle();
                if (orderPlayer) {
                    orderData = orderPlayer;
                    targetTable = 'orders_player';
                }
            }
            
            if (!orderData) return res.status(404).json({ success: false, message: 'Order tidak ditemukan di DB' });
            const currentDbStatus = String(orderData.status).toUpperCase();
            
            if (['SUCCESS', 'SELESAI', 'PROSES', 'PAID'].includes(currentDbStatus)) {
                return res.status(200).json({ success: true, message: 'Order sudah diproses sebelumnya' });
            }
            
            const productName = orderData.product_name || '';
            const userId = orderData.user_id;
            let nextStatus = 'SUCCESS';
            
            // Penyesuaian agar mendeteksi nama produk lama [VIP] dan yang baru [Mitra AU2Hub]
            if (productName.startsWith('[DEPOSIT]') || productName.includes('[VIP]') || productName.includes('Mitra AU2Hub')) {
                nextStatus = 'selesai';
            }
            
            const { data: lockedOrder, error: lockError } = await supabase
                .from(targetTable)
                .update({ 
                    status: nextStatus,
                    waktu_selesai: nextStatus === 'selesai' ? new Date().toISOString() : null
                })
                .eq('id', orderId)
                .eq('status', orderData.status)
                .select()
                .maybeSingle();
            
            if (lockError || !lockedOrder) {
                console.log(`⚠️ Race Condition dicegah! Webhook ganda untuk Order ID: ${orderId} diabaikan.`);
                return res.status(200).json({ success: true, message: 'Sudah diproses oleh request lain secara bersamaan' });
            }
            
            if (productName.startsWith('[DEPOSIT]')) {
                const depositMatch = productName.match(/\[DEPOSIT\]\s*(\d+)/);
                if (!depositMatch) {
                    await supabase.from(targetTable).update({ status: 'PENDING' }).eq('id', orderId);
                    return res.status(400).json({ success: false, message: 'Format nama deposit tidak valid' });
                }
                const amountToAdd = parseInt(depositMatch[1], 10);
                console.log(`💰 Top Up Saldo User: ${userId} | Saldo Masuk: Rp ${amountToAdd}`);
                
                const { error: rpcError } = await supabase.rpc('tambah_saldo', {
                    p_user_id: userId,
                    p_jumlah: amountToAdd
                });
                
                if (rpcError) {
                    console.error("🚨 Gagal memanggil RPC tambah_saldo:", rpcError);
                    await supabase.from(targetTable).update({ status: 'PENDING' }).eq('id', orderId);
                    return res.status(500).json({ success: false, message: 'Gagal menambah saldo di DB' });
                }
                
                await supabase.from('wallet_transactions').insert({
                    user_id: userId,
                    amount: amountToAdd,
                    type: 'INCOME',
                    description: `Top Up Saldo via QRIS Otomatis (Ref: ${orderId.substring(0,8).toUpperCase()})`
                });
                console.log(`✅ Top Up Berhasil untuk Order ${orderId}`);
            }
            else if ((productName.includes('[VIP]') || productName.includes('Mitra')) && targetTable === 'orders') {
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
                
                await supabase.from('profiles').update({ 
                    is_seller: true, 
                    seller_expired_at: waktuExpired.toISOString() 
                }).eq('id', userId);
                console.log(`👑 Perpanjangan Mitra AU2Hub Berhasil untuk User ${userId}`);
            }
            return res.status(200).json({ success: true, message: 'Callback processed successfully' });
        }
        return res.status(200).json({ success: true, message: 'Ignored non-success status' });

    } catch (error) {
        console.error("🚨 Webhook Error Internal:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
