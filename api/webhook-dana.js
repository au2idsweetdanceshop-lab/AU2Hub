import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Validasi Metode
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    // 2. Inisialisasi Supabase di DALAM fungsi agar Vercel tidak crash di awal
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; 

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error("FATAL ERROR: Environment Variables Supabase kosong!");
      return res.status(500).json({ error: 'Kunci database hilang dari Vercel' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. Tangkap data dari MacroDroid dengan aman
    const body = req.body || {};
    
    // Kita buat fleksibel: bisa menangkap "dana_teks", "nominal", atau format mentah
    const textNotif = body.dana_teks || body.nominal || "";

    if (!textNotif) {
      return res.status(400).json({ 
        status: 'ignored', 
        message: 'Teks notifikasi kosong. Pastikan MacroDroid mengirim parameter "dana_teks".' 
      });
    }

    // 4. Ekstrak angka murni dari teks DANA (Misal: "Masuk Rp3.437" menjadi 3437)
    const nominalTarget = parseInt(textNotif.replace(/\D/g, '')) || 0;

    if (nominalTarget === 0) {
      return res.status(400).json({ 
        status: 'ignored', 
        message: 'Tidak ada angka yang ditemukan dalam teks.' 
      });
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
      return res.status(500).json({ status: 'error', error: 'Gagal update database' });
    }

    // 6. Respon ke MacroDroid
    if (data && data.length > 0) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'Pembayaran valid! Status sukses dikonfirmasi.',
        nominal_masuk: nominalTarget 
      });
    } else {
      return res.status(200).json({ 
        status: 'not_found', 
        message: `Uang masuk (${nominalTarget}), tapi tidak ada orderan PENDING dengan harga tersebut.` 
      });
    }
    
  } catch (error) {
    // Jika masih ada error, Vercel akan mengirim JSON ini, bukan layar putih 500
    console.error("Server Crash:", error.toString());
    return res.status(500).json({ error: 'Kesalahan internal: ' + error.message });
  }
}
