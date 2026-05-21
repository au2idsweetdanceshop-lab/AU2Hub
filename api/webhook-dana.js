export default async function handler(req, res) {
  // Hanya izinkan MacroDroid mengirim data via metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    const { action, nominal } = req.body;

    if (action === 'PROCESS_PAYMENT') {
      const textNotif = nominal || "";
      
      // Ekstrak angka murni dari teks notif (Kebal titik/koma)
      const nominalTarget = parseInt(textNotif.replace(/\D/g, '')) || 0;

      // ---------------------------------------------------------
      // AREA UPDATE DATABASE
      // Di sinilah Anda memasukkan logika untuk mengubah status PENDING jadi SUCCESS
      // Contoh: await db.collection('deposit').updateOne({ nominal: nominalTarget, status: 'PENDING' }, { $set: { status: 'SUCCESS' } });
      // ---------------------------------------------------------

      // Respons kilat kembali ke MacroDroid
      return res.status(200).json({ 
        status: 'success', 
        message: 'Pembayaran diterima',
        nominal_masuk: nominalTarget 
      });
    }

    return res.status(200).json({ status: 'ignored' });
    
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
