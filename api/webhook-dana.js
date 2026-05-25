import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ Laporan: "GAGAL", Pesan: "Method harus POST" });
    }

    const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!URL || !KEY) {
      return res.status(200).json({ Laporan: "GAGAL", Pesan: "Key/URL kosong di Vercel" });
    }

    const supabase = createClient(URL, KEY);

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { }
    }

    const action = body?.action || "KOSONG";
    const nominal = body?.nominal || body?.dana_teks || "";

    // 🔍 [LOG DARI VERCEL] Cetak data yang dikirim oleh MacroDroid ke log Vercel
    console.log("=== DEBUG DATA DARI MACRODROID ===");
    console.log("Action received:", action);
    console.log("Nominal text received:", nominal);

    if (action !== 'PROCESS_PAYMENT') {
      return res.status(200).json({ Laporan: "IGNORED", Pesan: "Action salah" });
    }

    const nominalTarget = parseInt(nominal.replace(/\D/g, '')) || 0;
    console.log("Nominal angka hasil ekstraksi:", nominalTarget);

    // 🚀 1. Coba cari dan update di tabel 'orders' (Layanan Utama)
    let { data, error } = await supabase
      .from('orders')
      .update({ status: 'SUCCESS' })
      .eq('price', nominalTarget)
      .eq('status', 'PENDING')
      .select();

    if (error) {
      console.log("Error di tabel orders:", error.message);
      return res.status(200).json({ Laporan: "ERROR_DATABASE_ORDERS", Pesan: error.message });
    }

    // 🚀 2. Jika tidak ketemu di 'orders', cari di tabel 'orders_player' (Pasar Player)
    if (!data || data.length === 0) {
      console.log("Nominal tidak ada di 'orders', beralih mencari di 'orders_player'...");
      
      const { data: dataPlayer, error: errorPlayer } = await supabase
        .from('orders_player')
        .update({ status: 'SUCCESS' })
        .eq('price', nominalTarget)
        .eq('status', 'PENDING')
        .select();

      if (errorPlayer) {
        console.log("Error di tabel orders_player:", errorPlayer.message);
        return res.status(200).json({ Laporan: "ERROR_DATABASE_PLAYER", Pesan: errorPlayer.message });
      }

      // Timpa hasil data dengan data dari tabel player agar bisa terbaca oleh validasi di bawah
      data = dataPlayer; 
    }

    // 🔍 [LOG DARI VERCEL] Cetak hasil pencarian database ke log Vercel
    console.log("=== DEBUG HASIL SUPABASE FINAL ===");
    console.log("Jumlah baris yang berhasil diubah:", data ? data.length : 0);
    console.log("Data baris yang diubah:", JSON.stringify(data));

    // Validasi akhir untuk respon ke MacroDroid
    if (data && data.length > 0) {
      return res.status(200).json({ Laporan: "BERHASIL_SEMPURNA", Nominal: nominalTarget });
    } else {
      return res.status(200).json({ 
        Laporan: "TIDAK_ADA_YANG_TERUPDATE", 
        Pesan: `Gagal mengubah data. Nominal ${nominalTarget} tidak berstatus PENDING di tabel manapun.`
      });
    }

  } catch (err) {
    console.error("Crash Sistem:", err.message);
    return res.status(200).json({ Laporan: "CRASH_SISTEM", Pesan: err.message });
  }
}
