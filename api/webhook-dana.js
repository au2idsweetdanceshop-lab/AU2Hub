// api/webhook-dana.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://divckiqkodtqudcoxkjz.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmNraXFrb2R0cXVkY294a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MzIsImV4cCI6MjA5MzkyMjQzMn0.z_FIS_rpDQPQ7nNWpuvabH7qDYgu7uq6TlYj9LSOcJQ"; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    const { pesan } = req.body;
    console.log("=== NOTIFIKASI MASUK (TANPA KODE UNIK) ===");
    console.log("Isi Teks:", pesan);

    if (!pesan) {
      return res.status(400).json({ status: 'failed', message: 'Pesan kosong' });
    }

    // 1. Ambil nominal angka bulat dari notifikasi DANA
    const nominalRegex = /Rp\s?([\d.]+)/i;
    const matchNominal = pesan.match(nominalRegex);

    if (!matchNominal) {
      return res.status(200).json({ status: 'ignored', message: 'Bukan notifikasi nominal uang' });
    }

    const nominalUang = parseInt(matchNominal[1].replace(/\./g, ''));
    console.log("-> Nominal Terdeteksi:", nominalUang);

    // ====================================================================
    // LOGIKA ANTRIAN (FIFO): PILIH YANG DAFTAR DULUAN
    // ====================================================================
    // Kita cari data di tabel 'deposits' yang nominalnya cocok, status PENDING,
    // tapi diurutkan dari yang PALING LAMA dibuat (ascending: true)
    // ====================================================================
    const { data: invoice, error: findError } = await supabase
      .from('deposits') // ⚠️ Sesuaikan nama tabelmu di Supabase
      .select('*')
      .eq('amount', nominalUang)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true }) // <-- Kunci FIFO: Antrean terlama diproses duluan
      .limit(1)
      .maybeSingle(); // Pakai maybeSingle agar tidak crash jika data kosong

    if (findError || !invoice) {
      console.log(`Tidak ada antrean deposit PENDING untuk nominal Rp ${nominalUang}`);
      return res.status(200).json({ status: 'not_found', message: 'Deposit tidak ditemukan di DB' });
    }

    // 2. Jika ketemu, sukseskan antrean terlama tersebut
    const { error: updateError } = await supabase
      .from('deposits')
      .update({ status: 'SUCCESS', updated_at: new Date().toISOString() })
      .eq('id', invoice.id);

    if (updateError) throw updateError;

    console.log(`[SUKSES MEMPROSES] ID Transaksi: ${invoice.id} sebesar Rp ${nominalUang} sukses via Antrean Otomatis.`);

    return res.status(200).json({ 
      status: 'success', 
      message: 'Sistem Antrean berhasil meloloskan pembayaran!',
      nominal: nominalUang
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ status: 'error', error: error.message });
  }
};
