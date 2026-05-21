const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // 1. Hanya izinkan metode POST dari MacroDroid
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    // 2. Panggil Environment Variables DI DALAM fungsi agar Vercel tidak langsung meledak
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; 

    // Jika kunci kosong, tampilkan peringatan di log
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("FATAL ERROR: Environment Variables Supabase kosong!");
      return res.status(500).json({ error: 'Kunci database hilang dari Vercel. Wajib Redeploy!' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. Tangkap data dari MacroDroid
    const { action, nominal } = req.body || {};

    if (action === 'PROCESS_PAYMENT') {
      const textNotif = nominal || "";
      
      if (!textNotif) {
        return res.status(400).json({ status: 'ignored', message: 'Teks notifikasi (nominal) kosong.' });
      }
      
      // 4. Ekstrak angka murni dari teks notif DANA (Kebal titik/koma/enter)
      const nominalTarget = parseInt(textNotif.replace(/\D/g, '')) || 0;

      if (nominalTarget === 0) {
        return res.status(400).json({ status: 'ignored', message: 'Tidak ada angka yang ditemukan dalam teks.' });
      }

      // 5. Eksekusi Pencarian & Pembaruan di Supabase
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'SUCCESS' })
        .eq('price', nominalTarget)
        .eq('status', 'PENDING')
        .select();

      if (error) {
        console.error("Supabase Error:", error.message);
        return res.status(500).json({ status: 'error', error: 'Gagal memperbarui database: ' + error.message });
      }

      // 6. Respon ke MacroDroid
      if (data && data.length > 0) {
        return res.status(200).json({ 
          status: 'success', 
          message: 'Pembayaran DANA valid, status sukses dikonfirmasi!',
          nominal_masuk: nominalTarget 
        });
      } else {
        return res.status(200).json({ 
          status: 'not_found', 
          message: `Nominal terdeteksi (Rp ${nominalTarget}), tetapi tidak cocok dengan antrean deposit PENDING mana pun.` 
        });
      }
    }

    return res.status(200).json({ status: 'ignored', message: 'Action bukan PROCESS_PAYMENT' });
    
  } catch (error) {
    console.error("Server Crash Internal:", error.toString());
    return res.status(500).json({ error: 'Terjadi kesalahan internal server: ' + error.message });
  }
};
