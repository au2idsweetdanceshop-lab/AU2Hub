import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key agar punya akses 'Dewa' menembus RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
    // Webhook selalu menggunakan metode POST
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // ==========================================
    // 1. PAKSA CETAK LOG (Biar data Xoftware kelihatan di Vercel)
    // ==========================================
    console.log("📥 WEBHOOK MASUK DARI XOFTWARE:", JSON.stringify(req.body, null, 2));

    const callbackData = req.body;

    // ==========================================
    // 2. AMBIL ID ORDER (Diserasikan dengan provider_ref milik Xoftware)
    // ==========================================
    const orderId = callbackData.provider_ref || callbackData.ref_id || callbackData.order_id; 

    if (!orderId) {
        console.log("⚠️ Sinyal masuk, tapi ID Order tidak ditemukan di payload.");
        return res.status(200).json({ success: false, message: 'ID Order tidak ditemukan' });
    }

    // ==========================================
    // 3. JIKA PEMBAYARAN BERHASIL, BACA DAN UPDATE DATABASE
    // ==========================================
    const statusXoftware = callbackData.status ? String(callbackData.status).toUpperCase() : '';

    if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || callbackData.payment_status === 'SUCCEEDED') {
        
        console.log(`🔄 Sedang memproses ID: ${orderId}...`);

        // A. CARI DATA PESANAN (Mencari di tabel orders admin ATAU orders_player)
        let orderData = null;
        let targetTable = 'orders';

        // Coba cari di tabel pesanan admin
        let { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', orderId).single();
        
        if (orderAdmin) {
            orderData = orderAdmin;
        } else {
            // Jika tidak ada, cari di tabel pasar player
            let { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', orderId).single();
            if (orderPlayer) {
                orderData = orderPlayer;
                targetTable = 'orders_player';
            }
        }

        // B. JIKA ORDER TIDAK DITEMUKAN DI KEDUA TABEL
        if (!orderData) {
            console.error(`❌ Order ID ${orderId} tidak ditemukan di database.`);
            return res.status(200).json({ success: false, message: 'Order tidak ditemukan' });
        }

        const productName = orderData.product_name || '';
        const userId = orderData.user_id;

        // C. LOGIKA PINTAR: CEK APAKAH INI PEMBELIAN VIP SELLER
        if (productName.includes('[VIP]')) {
            console.log(`👑 Pembelian VIP terdeteksi untuk User: ${userId}`);

            // 1. Ambil data profil untuk mengecek sisa masa aktif saat ini
            const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();

            let waktuSekarang = new Date();
            let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();

            // Jika masa aktif sudah habis/lewat, mulai hitungan murni dari hari ini
            if (waktuExpired < waktuSekarang) {
                waktuExpired = waktuSekarang;
            }

            // 2. Hitung penambahan waktu
            if (productName.includes('1 Bulan')) {
                waktuExpired.setDate(waktuExpired.getDate() + 30);
            } else if (productName.includes('1 Tahun')) {
                waktuExpired.setDate(waktuExpired.getDate() + 365);
            }

            // 3. Update tabel profiles
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

            // 4. Update order menjadi "selesai" (VIP otomatis tanpa perlu dikirim barang)
            await supabase.from(targetTable)
                .update({ status: 'selesai', waktu_selesai: new Date().toISOString() })
                .eq('id', orderId);

        } else {
            // D. JIKA BUKAN VIP (Order Biasa) -> Ubah ke 'SUCCESS' agar Auto-Delivery Frontend berjalan
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', orderId);
        }
        
        console.log(`✅ BERHASIL! Proses Webhook selesai untuk Order ${orderId}.`);
        return res.status(200).json({ success: true, message: 'Callback received and processed' });
    }

    // Jika statusnya PENDING atau FAILED, abaikan saja
    console.log(`ℹ️ Status diabaikan karena bukan sukses: ${callbackData.status}`);
    return res.status(200).json({ success: true, message: 'Ignored status: ' + callbackData.status });
}
