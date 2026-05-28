// api/create-qris.js
import crypto from 'crypto';

export default async function handler(req, res) {
    // Pastikan cuma nerima request POST dari frontend
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // Data yang dikirim dari frontend kamu (fungsi checkoutXoftwarePay)
    const { order_id, amount, product_name, customer_name } = req.body;

    // 1. TARIK KUNCI RAHASIA DARI VERCEL (Sesuai gambar 61615.jpg)
    const merchantId = process.env.XOFTWARE_MERCHANT_ID; // Isinya: 129
    const baseUrl = process.env.XOFTWARE_BASE_URL;       // Isinya: https://payment1.xoftware.id
    const apiKey = process.env.XOFTWARE_API_KEY;         // Isinya: MDKhu...

    try {
        // 2. BUAT SIGNATURE (Nah, ini kamu harus cek di dokumentasi Xoftware)
        // Rumus di bawah ini cuma CONTOH UMUM. Xoftware pasti punya rumusnya sendiri.
        // Bisa jadi pakai md5(merchantId + order_id + amount + apiKey)
        const signatureString = `${merchantId}${order_id}${amount}${apiKey}`;
        const signature = crypto.createHash('md5').update(signatureString).digest('hex');

        // 3. SUSUN PAYLOAD SESUAI DOKUMENTASI XOFTWARE
        // Nama-nama variabel di kiri (seperti 'amount', 'buyer_name') HARUS sama persis dengan kemauan API Xoftware.
        const payload = {
            merchant_id: merchantId,
            transaction_id: order_id, // atau 'merchant_ref' (cek API docs)
            amount: amount,
            buyer_name: customer_name,
            signature: signature,
            // ... (tambahkan parameter lain jika diwajibkan oleh Xoftware)
        };

        // 4. TEMBAK KE SERVER XOFTWARE
        // Ingat, endpoint-nya gabungan Base URL + Path Endpoint-nya
        // Contoh Path: /api/v1/qris/create (Cek di API Docs!)
        const response = await fetch(`${baseUrl}/api/v1/qris/create`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Cek dokumentasi: Apakah Xoftware butuh Bearer token atau cuma naruh API Key di payload/header lain?
                'Authorization': `Bearer ${apiKey}` 
            },
            body: JSON.stringify(payload)
        });

        // Tangkap balasan dari Xoftware
        const dataXoftware = await response.json();

        // 5. KEMBALIKAN HASIL KE FRONTEND
        // Cek struktur JSON balasan Xoftware, biasanya ada status/success dan data QR-nya
        if (dataXoftware.status === true || dataXoftware.success === true) {
            return res.status(200).json({
                success: true,
                // Sesuaikan 'dataXoftware.data.qr_string' dengan nama kunci dari Xoftware
                qris_string: dataXoftware.data.qr_string 
            });
        } else {
            // Kalau error dari Xoftware (misal saldo kurang, signature salah)
            throw new Error(dataXoftware.message || 'Gagal membuat QRIS dari Gateway');
        }

    } catch (error) {
        console.error("QRIS Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
