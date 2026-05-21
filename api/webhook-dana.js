import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 🔥 GOD MODE: Semua respon dipaksa jadi 200 agar MacroDroid tidak ngambek 
  // dan kita bisa membaca pesan error aslinya!

  try {
    if (req.method !== 'POST') {
      return res.status(200).json({ Laporan: "GAGAL", Pesan: "Method harus POST" });
    }

    // Tangkap kunci rahasia (Support variabel standar maupun Next.js)
    const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!URL || !KEY) {
      return res.status(200).json({ 
        Laporan: "GAGAL", 
        Pesan: "Environment Variables Supabase KOSONG. Pastikan kamu sudah Redeploy di Vercel!" 
      });
    }

    const supabase = createClient(URL, KEY);

    // Amankan parsing JSON dari MacroDroid (Antisipasi JSON rusak)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) { }
    }

    const action = body?.action || "KOSONG";
    const nominal = body?.nominal || body?.dana_teks || "";

    if (action !== 'PROCESS_PAYMENT') {
      return res.status(200).json({ 
        Laporan: "GAGAL", 
        Pesan: "Variabel 'action' tidak terbaca atau bukan PROCESS_PAYMENT",
        Data_Diterima: body
      });
    }

    // Ekstrak nominal
    const nominalTarget = parseInt(nominal.replace(/\D/g, '')) || 0;

    if (nominalTarget === 0) {
      return res.status(200).json({ 
        Laporan: "GAGAL", 
        Pesan: "Gagal menemukan angka harga di dalam teks DANA",
        Teks_Asli: nominal
      });
    }

    // Tembak Supabase
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'SUCCESS' })
      .eq('price', nominalTarget)
      .eq('status', 'PENDING')
      .select();

    if (error) {
      return res.status(200).json({ 
        Laporan: "ERROR_DATABASE", 
        Pesan: error.message 
      });
    }

    if (data && data.length > 0) {
      return res.status(200).json({ 
        Laporan: "BERHASIL_SEMPURNA", 
        Pesan: "Status di Supabase sukses diubah jadi SUCCESS!",
        Nominal: nominalTarget
      });
    } else {
      return res.status(200).json({ 
        Laporan: "TIDAK_ADA_ORDERAN", 
        Pesan: `Uang masuk Rp${nominalTarget}, tapi tidak ada antrean PENDING dengan harga itu di Supabase.`
      });
    }

  } catch (err) {
    return res.status(200).json({ 
      Laporan: "CRASH_SISTEM", 
      Pesan: err.message 
    });
  }
}
