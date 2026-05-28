import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, amount, product_name, customer_name } = req.body;

    // 1. TARIK DATA DARI VERCEL ENVIRONMENT VARIABLES
    const merchantId = process.env.XOFTWARE_MERCHANT_ID;
    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         

    try {
        // 2. SUSUN PAYLOAD SESUAI DOKUMENTASI
        const payload = {
            merchant_id: parseInt(merchantId), // Wajib format Int64
            channel_code: "QRIS", // Identifier untuk e-wallet/QRIS
            amount: parseInt(amount), // Wajib angka utuh (min. 1000)
            ref_id: order_id, // Referensi unik maksimum 50 karakter
            fee_direction: "merchant", // Memotong biaya MDR/layanan dari saldo admin (ubah jadi "user" jika pembeli yang bayar admin)
            notify_url: "https://au2hub.com/api/webhook", // WAJIB GANTI: Link endpoint webhook vercel kamu nanti
            note: `Pembayaran: ${product_name}`, // Internal remark opsional
            metadata: {
                customer: {
                    name: customer_name || "Player AU2Hub" // Info detail dari schema metadata
                }
            }
        };

        // 3. BUAT SIGNATURE (HMAC-SHA256)
        // Dokumentasi meminta HMAC-SHA256.
        // (Pastikan mengecek detail spesifik di menu "Authentication & Signature" jika mereka punya rumus penggabungan string yang unik).
        const payloadString = JSON.stringify(payload);
        const signature = crypto
            .createHmac('sha256', apiKey)
            .update(payloadString)
            .digest('hex');

        // 4. TEMBAK KE SERVER XOFTWARE
        const response = await fetch(`${baseUrl}/v1/api/transactions`, { // Endpoint Transaction API
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`, // Format standar pengiriman kunci API
                'X-Signature': signature // Header HMAC-SHA256 (sesuaikan jika Xoftware meminta nama header spesifik)
            },
            body: payloadString
        });

        const dataXoftware = await response.json();

        // 5. KEMBALIKAN STRING QRIS KE FRONTEND
        // Jika sukses, status awalnya adalah 'PENDING'
        if (response.ok && dataXoftware.status === "PENDING") { 
            return res.status(200).json({
                success: true,
                qris_string: dataXoftware.qris_text // String QRIS mentah dari response payload Xoftware
            });
        } else {
            // Jika ditolak (misal: nominal < 1000 atau signature salah)
            throw new Error(dataXoftware.message || 'Gagal membuat QRIS dari Gateway Xoftware');
        }

    } catch (error) {
        console.error("QRIS Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
