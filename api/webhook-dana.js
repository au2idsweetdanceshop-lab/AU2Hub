// api/webhook-dana.js
module.exports = async (req, res) => {
  // Sistem hanya menerima kiriman data metode POST dari MacroDroid HP-mu
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    const { pesan } = req.body;

    if (!pesan) {
      return res.status(400).json({ status: 'failed', message: 'Pesan kosong' });
    }

    // 1. Ekstrak nominal angka bulat dari teks notifikasi DANA kamu
    const nominalRegex = /Rp\s?([\d.]+)/i;
    const matchNominal = pesan.match(nominalRegex);

    if (!matchNominal) {
      return res.status(200).json({ status: 'ignored', message: 'Bukan notifikasi nominal uang' });
    }

    const nominalUang = parseInt(matchNominal[1].replace(/\./g, ''));

    // 2. Menembak link Google Apps Script yang barusan kamu deploy!
    const GAS_URL = "https://script.google.com/macros/s/AKfycbyidsRrTER7gyLZSdgMSCh5y8ZirxicS7cF31CqS1_WVL72i2R6KtZclpu1RUCfBshi/exec"; 

    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "PROCESS_PAYMENT",
        nominal: nominalUang
      })
    });

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
};
