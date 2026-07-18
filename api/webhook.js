import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const xoftwareApiKey = process.env.XOFTWARE_API_KEY;
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
    try {
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
            if (productName.startsWith('[DEPOSIT]') || productName.includes('[VIP]')) {
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
                await supabase.from('profiles').update({ 
                    is_seller: true, 
                    seller_expired_at: waktuExpired.toISOString() 
                }).eq('id', userId);
                console.log(`👑 Perpanjangan VIP Berhasil untuk User ${userId}`);
            }
            return res.status(200).json({ success: true, message: 'Callback processed successfully' });
        }
        return res.status(200).json({ success: true, message: 'Ignored non-success status' });
    } catch (error) {
        console.error("🚨 Webhook Error Internal:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}
