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
    // 3. JIKA PEMBAYARAN BERHASIL, UPDATE DATABASE
    // ==========================================
    // Kita buat standarisasi huruf besar (Uppercase) agar tidak sensitif huruf besar/kecil
    const statusXoftware = callbackData.status ? String(callbackData.status).toUpperCase() : '';

    if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || callbackData.payment_status === 'SUCCEEDED') {
        
        console.log(`🔄 Sedang memperbarui status SUCCESS untuk ID: ${orderId}...`);

        // Eksekusi Update ke Supabase untuk kedua tabel kamu
        const { error: err1 } = await supabase.from('orders').update({ status: 'SUCCESS' }).eq('id', orderId);
        const { error: err2 } = await supabase.from('orders_player').update({ status: 'SUCCESS' }).eq('id', orderId);
        
        if (err1 && err2) {
            console.error("❌ Gagal update database di kedua tabel:", err1, err2);
            return res.status(200).json({ success: false, message: 'Gagal update database' });
        } 
        
        console.log(`✅ BERHASIL! Status Order ${orderId} di kedua tabel Supabase kini SUCCESS.`);
        return res.status(200).json({ success: true, message: 'Callback received and processed' });
    }

    // Jika statusnya PENDING atau FAILED, abaikan saja
    console.log(`ℹ️ Status diabaikan karena bukan sukses: ${callbackData.status}`);
    return res.status(200).json({ success: true, message: 'Ignored status: ' + callbackData.status });
}
