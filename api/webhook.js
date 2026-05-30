import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key agar punya akses 'Dewa' menembus RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    console.log("📥 WEBHOOK MASUK DARI XOFTWARE:", JSON.stringify(req.body, null, 2));

    const callbackData = req.body;
    const orderId = callbackData.provider_ref || callbackData.ref_id || callbackData.order_id; 

    if (!orderId) {
        console.log("⚠️ Sinyal masuk, tapi ID Order tidak ditemukan di payload.");
        return res.status(200).json({ success: false, message: 'ID Order tidak ditemukan' });
    }

    const statusXoftware = callbackData.status ? String(callbackData.status).toUpperCase() : '';

    if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || callbackData.payment_status === 'SUCCEEDED') {
        
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
        // 👑 LOGIKA VIP SELLER (DIPERBAIKI)
        // ==========================================
        if (productName.includes('[VIP]')) {
            console.log(`👑 Pembelian VIP terdeteksi untuk User: ${userId}`);

            const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();

            let waktuSekarang = new Date();
            let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();

            if (waktuExpired < waktuSekarang) {
                waktuExpired = waktuSekarang;
            }

            // --- PERBAIKAN LOGIKA WAKTU ---
            if (productName.includes('1 Tahun')) {
                waktuExpired.setDate(waktuExpired.getDate() + 365);
            } else {
                // Deteksi otomatis angka bulan berapapun (1, 2, 3, 10, dst)
                const match = productName.match(/(\d+)\s+Bulan/i);
                if (match) {
                    const jumlahBulan = parseInt(match[1]);
                    waktuExpired.setDate(waktuExpired.getDate() + (jumlahBulan * 30));
                } else {
                    // Fallback aman jika nama produk aneh
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
                console.error("❌ Gagal update status VIP di tabel profil:", profileErr);
            } else {
                console.log(`✅ Profil ${userId} sukses diupdate jadi VIP sampai ${waktuExpired.toISOString()}`);
            }

            await supabase.from(targetTable)
                .update({ status: 'selesai', waktu_selesai: new Date().toISOString() })
                .eq('id', orderId);

        } else {
            // ORDER BIASA
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', orderId);
        }
        
        console.log(`✅ BERHASIL! Proses Webhook selesai untuk Order ${orderId}.`);
        return res.status(200).json({ success: true, message: 'Callback received and processed' });
    }

    console.log(`ℹ️ Status diabaikan karena bukan sukses: ${callbackData.status}`);
    return res.status(200).json({ success: true, message: 'Ignored status: ' + callbackData.status });
}
