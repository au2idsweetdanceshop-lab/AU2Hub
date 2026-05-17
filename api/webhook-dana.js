// api/webhook-dana.js
const { createClient } = require('@supabase/supabase-js');

// Menggunakan URL Supabase yang ada di kodingan HTML kamu
const SUPABASE_URL = "https://divckiqkodtqudcoxkjz.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmNraXFrb2R0cXVkY294a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MzIsImV4cCI6MjA5MzkyMjQzMn0.z_FIS_rpDQPQ7nNWpuvabH7qDYgu7uq6TlYj9LSOcJQ"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  // Pastikan hanya menerima request POST dari MacroDroid
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    const { pesan } = req.body;
    console.log("=== NOTIFIKASI MASUK DARI MACRODROID ===");
    console.log("Isi Teks:", pesan);

    if (!pesan) {
      return res.status(400).json({ status: 'failed', message: 'Pesan kosong' });
    }

    // 1. Ekstrak nominal angka dari teks notifikasi DANA pakai Regex
    const nominalRegex = /Rp\s?([\d.]+)/i;
    const matchNominal = pesan.match(nominalRegex);

    if (!matchNominal) {
      return res.status(200).json({ status: 'ignored', message: 'Bukan notifikasi nominal uang' });
    }

    // Mengubah string "10.005" menjadi angka murni 10005
    const nominalUang = parseInt(matchNominal[1].replace(/\./g, ''));
    console.log("-> Nominal Terdeteksi:", nominalUang);

    // ====================================================================
    // LOGIKA OTOMATISASI DATABASE (SINKRONISASI INVOICE)
    // ====================================================================
    // Sistem akan mencari di tabel database kamu (misal nama tabelnya 'deposits' atau 'invoices')
    // Mencari yang statusnya masih 'PENDING' dan nominalnya cocok/sama persis.
    // ====================================================================
    const { data: invoice, error: findError } = await supabase
      .from('deposits') // ⚠️ Ganti 'deposits' dengan nama tabel invoice/deposit di Supabase-mu
      .select('*')
      .eq('amount', nominalUang)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !invoice) {
      console.log(`Invoice pending tidak ditemukan untuk nominal Rp ${nominalUang}`);
      return res.status(200).json({ status: 'not_found', message: 'Data deposit tidak ditemukan di database' });
    }

    // 2. Jika invoice pending ditemukan, ubah statusnya menjadi SUCCESS
    await supabase
      .from('deposits') // ⚠️ Sesuaikan dengan nama tabelmu
      .update({ status: 'SUCCESS', updated_at: new Date().toISOString() })
      .eq('id', invoice.id);

    console.log(`[SUKSES] Deposit untuk User ID: ${invoice.user_id} sebesar Rp ${nominalUang} berhasil diaktifkan robot!`);

    // Tambahan: Di sini kamu bisa selipkan kode untuk menambah saldo di sistem tokomu
    // atau menembak API Digiflazz/Xoftware untuk memproses item game pembeli secara otomatis.

    return res.status(200).json({ 
      status: 'success', 
      message: 'Robot Kasir berhasil memproses pembayaran otomatis!',
      nominal: nominalUang
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ status: 'error', error: error.message });
  }
};
