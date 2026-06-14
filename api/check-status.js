import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ==========================================
// 👑 FUNGSI INTI: UPDATE DATABASE & VIP LOGIC
// ==========================================
async function prosesPembayaranLunas(order_id, targetTable, orderData) {
    const productName = orderData.product_name || '';
    const userId = orderData.user_id;

    if (productName.includes('[VIP]')) {
        const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();
        
        let waktuSekarang = new Date();
        let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();

        // Kalau kadaluarsa, mulai hitung dari hari ini
        if (waktuExpired < waktuSekarang) {
            waktuExpired = waktuSekarang;
        }

        // Deteksi durasi dari nama produk dengan REGEX yang lebih pintar
        if (productName.includes('1 Tahun')) {
            waktuExpired.setDate(waktuExpired.getDate() + 365);
        } else {
            const matchBulan = productName.match(/(\d+)\s+Bulan/i);
            const matchHari = productName.match(/(\d+)\s+Hari/i);

            if (matchBulan) {
                const jumlahBulan = parseInt(matchBulan[1]);
                waktuExpired.setDate(waktuExpired.getDate() + (jumlahBulan * 30));
            } else if (matchHari) {
                const jumlahHari = parseInt(matchHari[1]);
                waktuExpired.setDate(waktuExpired.getDate() + jumlahHari); // <--- HARI SUDAH TERBACA AKURAT
            } else {
                // Default aman jika format nama produk tidak dikenali
                waktuExpired.setDate(waktuExpired.getDate() + 30); 
            }
        }

        // Tembak Profil Jadi VIP
        await supabase.from('profiles')
            .update({ 
                is_seller: true, 
                seller_expired_at: waktuExpired.toISOString() 
            })
            .eq('id', userId);

        // Update order jadi 'selesai'
        let updatePayload = { status: 'selesai' };
        if (targetTable === 'orders_player') {
            updatePayload.waktu_selesai = new Date().toISOString();
        }
        await supabase.from(targetTable).update(updatePayload).eq('id', order_id);

    } else {
        // Order biasa
        await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
    }
}

export default async function handler(req, res) {
    // =================================================================
    // 🔔 JALUR 1: WEBHOOK (Otomatis Menerima Laporan dari Xoftware)
    // =================================================================
    if (req.method === 'POST') {
        try {
            const payload = req.body;
            console.log("🔔 Webhook Masuk dari Xoftware:", payload);

            // Sesuaikan key (ref_id/order_id) dengan format dokumentasi Webhook Xoftware
            const order_id = payload.ref_id || payload.order_id || payload.external_id;
            const statusUtama = payload.status || payload.payment_status || '';

            if (!order_id) return res.status(400).json({ message: 'Missing order_id' });

            // Deteksi pesanan ini berasal dari tabel mana
            let targetTable = 'orders';
            let { data: orderData } = await supabase.from('orders').select('*').eq('id', order_id).single();

            if (!orderData) {
                const { data: playerOrderData } = await supabase.from('orders_player').select('*').eq('id', order_id).single();
                if (playerOrderData) {
                    orderData = playerOrderData;
                    targetTable = 'orders_player';
                }
            }

            if (!orderData) return res.status(404).json({ message: 'Order tidak ditemukan' });

            // Jika statusnya berhasil, eksekusi pembaruan database
            if (
                statusUtama.toUpperCase() === 'SUCCESS' || 
                statusUtama.toUpperCase() === 'SUCCEEDED' || 
                statusUtama.toUpperCase() === 'SETTLED' || 
                statusUtama.toUpperCase() === 'PAID'
            ) {
                await prosesPembayaranLunas(order_id, targetTable, orderData);
            }

            return res.status(200).json({ success: true, message: 'Webhook berhasil diproses' });
        } catch (error) {
            console.error("🔥 Webhook Error:", error.message);
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    // =================================================================
    // 🔍 JALUR 2: CEK MANUAL (Tarikan API dari Frontend aplikasimu)
    // =================================================================
    if (req.method === 'GET') {
        const { order_id, table } = req.query;
        if (!order_id) return res.status(400).json({ message: 'Missing order_id' });

        const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';
        const baseUrl = process.env.XOFTWARE_BASE_URL;       
        const apiKey = process.env.XOFTWARE_API_KEY;         
        const timestamp = Math.floor(Date.now() / 1000).toString();
        
        try {
            const path = '/v1/api/transactions/status';
            const payloadObject = { ref_id: order_id };
            const payloadString = JSON.stringify(payloadObject);
            
            const method = 'POST';
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
            
            const rawText = await response.text();

            let result;
            try {
                result = JSON.parse(rawText);
            } catch (e) {
                return res.status(200).json({ success: false, status: 'PENDING', message: 'Respons bukan JSON' });
            }
            
            const statusUtama = result.data?.status || '';
            const statusPembayaran = result.data?.payment_status || '';

            if (
                statusUtama.toUpperCase() === 'SUCCESS' || 
                statusPembayaran.toUpperCase() === 'SUCCEEDED' || 
                statusUtama.toUpperCase() === 'SETTLED' || 
                statusPembayaran.toUpperCase() === 'SETTLED' || 
                statusUtama.toUpperCase() === 'PAID'
            ) {
                const { data: orderData } = await supabase.from(targetTable).select('*').eq('id', order_id).single();
                if (orderData) {
                    await prosesPembayaranLunas(order_id, targetTable, orderData);
                } else {
                    // Fallback darurat
                    await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
                }
                return res.status(200).json({ success: true, status: 'SUCCESS' });
            }

            return res.status(200).json({ success: true, status: 'PENDING', detail: statusUtama });
            
        } catch (error) {
            console.error("🔥 CRITICAL ERROR:", error.message);
            return res.status(200).json({ success: false, status: 'PENDING', message: error.message });
        }
    }

    // Jika metode selain GET/POST
    return res.status(405).json({ message: 'Method Not Allowed' });
}
