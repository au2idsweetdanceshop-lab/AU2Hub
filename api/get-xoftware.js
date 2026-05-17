// File: api/get-xoftware.js

export default async function handler(req, res) {
    // 1. Ambil API Key dari Vercel Environment
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key belum disetting di Vercel' });
    }

    // 2. Baca parameter 'action' yang dikirim dari website (HTML)
    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';

    try {
        let targetUrl = '';
        let options = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'x-api-key': apiKey 
            }
        };

        // 3. Sistem Pemilah Fitur Berdasarkan Data dari Kamu
        if (action === 'saldo') {
            // Menangani Cek Saldo & Informasi Pengguna (Data No. 4)
            targetUrl = `${baseUrl}/profile`; 
            options.method = 'GET';
        } 
        else if (action === 'produk') {
            // Menangani Daftar Produk Contoh (Data No. 2)
            targetUrl = `${baseUrl}/products`; 
            options.method = 'GET';
        } 
        else if (action === 'order') {
            // Menangani Transaksi, Pembayaran & Registrasi (Data No. 3 & 5)
            if (req.method !== 'POST') {
                return res.status(405).json({ status: false, message: 'Harus menggunakan POST untuk order' });
            }
            targetUrl = `${baseUrl}/order`; 
            options.method = 'POST';
            options.body = JSON.stringify(req.body); // Oper data pesanan dari website ke Xoftware
        } 
        else if (action === 'qris') {
            // Menangani Pembelian/Topup via QRIS & Deposit (Data No. 6 & 7)
            if (req.method !== 'POST') {
                return res.status(405).json({ status: false, message: 'Harus menggunakan POST untuk QRIS' });
            }
            targetUrl = `${baseUrl}/deposit/qris`; 
            options.method = 'POST';
            options.body = JSON.stringify(req.body); // Oper data nominal/produk ke Xoftware
        } 
        else {
            // Jika website memanggil tanpa action yang jelas
            return res.status(400).json({ status: false, message: 'Action request tidak valid' });
        }

        // 4. Tembak ke Server Xoftware secara aman
        const response = await fetch(targetUrl, options);
        const data = await response.json();

        // 5. Kembalikan jawaban dari Xoftware langsung ke website kamu
        return res.status(200).json(data);

    } catch (error) {
        console.error("Xoftware API Error:", error);
        return res.status(500).json({ status: false, message: 'Gagal menghubungi server Xoftware' });
    }
}
