// api/webhook-dana.js
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    const { pesan } = req.body;
    console.log("=== NOTIFIKASI MASUK (JALUR GOOGLE SHEETS) ===");

    if (!pesan) {
      return res.status(400).json({ status: 'failed', message: 'Pesan kosong' });
    }

    // 1. Ekstrak nominal uang bulat dari notifikasi DANA
    const nominalRegex = /Rp\s?([\d.]+)/i;
    const matchNominal = pesan.match(nominalRegex);

    if (!matchNominal) {
      return res.status(200).json({ status: 'ignored', message: 'Bukan notifikasi nominal uang' });
    }

    const nominalUang = parseInt(matchNominal[1].replace(/\./g, ''));
    console.log("-> Nominal Terdeteksi:", nominalUang);

    // 2. Teruskan data ke Google Apps Script (GAS Web URL)
    // ⚠️ Ganti URL di bawah dengan link Aplikasi Web GAS dari Google Sheets kamu!
    const GAS_URL = "CONTOH_LINK_APPS_SCRIPT_GOOGLE_SHEETS_KAMU"; 

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "PROCESS_PAYMENT",
        nominal: nominalUang,
        pesan: pesan
      })
    });

    const result = await response.json();
    console.log("-> Respon dari Google Sheets:", result);

    return res.status(200).json(result);

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ status: 'error', error: error.message });
  }
};
