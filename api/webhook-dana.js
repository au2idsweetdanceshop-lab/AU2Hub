import { createClient } from '@supabase/supabase-js';

// Memanggil variabel lingkungan rahasia dari dashboard Vercel
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; 

// Inisialisasi Supabase menggunakan SERVICE_ROLE_KEY agar kebal dari aturan RLS
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  // Hanya izinkan MacroDroid mengirim data via metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    const { action, nominal } = req.body;

    if (action === 'PROCESS_PAYMENT') {
      const textNotif = nominal || "";
      
      // Ekstrak angka murni dari teks notif DANA (Kebal titik/koma)
      const nominalTarget = parseInt(textNotif.replace(/\D/g, '')) || 0;

      // ---------------------------------------------------------
      // PRO-FIX: LOGIKA PEMBARUAN STATUS DATABASE SUPABASE
      // ---------------------------------------------------------
      // Mencari antrean orderan PENDING yang harganya cocok, lalu ubah ke SUCCESS
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'SUCCESS' })
        .eq('price', nominalTarget)
        .eq('status', 'PENDING')
        .select(); // Mengembalikan data baris yang berhasil diubah

      if (error) {
        console.error("Supabase Error:", error.message);
        return res.status(500).json({ status: 'error', error: 'Gagal memperbarui database' });
      }

      // Jika ada baris orderan PENDING yang cocok dan berhasil diubah statusnya
      if (data && data.length > 0) {
        return res.status(200).json({ 
          status: 'success', 
          message: 'Pembayaran DANA valid, status sukses dikonfirmasi!',
          nominal_masuk: nominalTarget 
        });
      } else {
        // Uang masuk ke DANA beneran, tapi tidak ada user yang membuat antrean dengan harga tersebut
        return res.status(200).json({ 
          status: 'not_found', 
          message: 'Nominal terdeteksi, tetapi tidak cocok dengan antrean deposit mana pun' 
        });
      }
    }

    return res.status(200).json({ status: 'ignored' });
    
  } catch (error) {
    console.error("Server Crash:", error.toString());
    return res.status(500).json({ error: 'Terjadi kesalahan server internal' });
  }
}
