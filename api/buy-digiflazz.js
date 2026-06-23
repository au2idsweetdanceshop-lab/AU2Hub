import crypto from 'crypto';
// Jika Anda pakai Supabase, import client Supabase di sini

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Hanya menerima POST' });

    // 1. Tangkap data dari tombol beli di aplikasi Anda
    const { user_id, sku_code, customer_no } = req.body;

    try {
        // [OPSIONAL TAPI WAJIB] 
        // Lakukan logika Cek Saldo Supabase dan Potong Saldo di sini sebelum lanjut!
        // ...
        
        // 2. Siapkan Kredensial Digiflazz Anda
        const username = process.env.DIGIFLAZZ_USERNAME; // Taruh di Environment Variables Vercel
        const apiKey = process.env.DIGIFLAZZ_KEY;       // Taruh di Environment Variables Vercel
        
        // Membuat ID Transaksi unik (Ref ID)
        const ref_id = "ORDER_" + Date.now();

        // 3. Rumus Rahasia Digiflazz (Signature MD5)
        const sign = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');

        // 4. Rakit Pesanan
        const payloadDigi = {
            username: username,
            buyer_sku_code: sku_code,   // Contoh: 'xld10'
            customer_no: customer_no,   // Contoh: '081234567890'
            ref_id: ref_id,
            sign: sign
        };

        // 5. TEMBAK KE JEMBATAN VPS ANDA!
        const response = await fetch('http://203.194.114.209:3000/proxy-digiflazz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_url: 'https://api.digiflazz.com/v1/transaction',
                payload: payloadDigi
            })
        });

        const dataDigi = await response.json();

        // 6. [OPSIONAL] Simpan dataDigi ini ke tabel 'riwayat_transaksi' di Supabase
        // ...

        // Berikan respon ke aplikasi pembeli
        res.status(200).json({ success: true, message: 'Transaksi diproses!', data: dataDigi });

    } catch (error) {
        console.error(error);
        // Jika error, jangan lupa KEMBALIKAN (Refund) saldo Supabase pembeli di sini!
        res.status(500).json({ success: false, error: 'Gagal memproses pesanan' });
    }
}
