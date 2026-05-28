import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, amount, product_name, customer_name } = req.body;

    // 1. SIAPKAN KUNCI RAHASIA (Simpan di Environment Variables Vercel, jangan di-hardcode!)
    const apiKey = process.env.XOFTWARE_API_KEY;
    const merchantCode = process.env.XOFTWARE_MERCHANT_CODE;
    const privateKey = process.env.XOFTWARE_PRIVATE_KEY; // Kadang butuh ini untuk signature

    try {
        // 2. BUAT SIGNATURE (Wajib cek dokumentasi Xoftware untuk rumus pastinya!)
        // Contoh umum: md5/sha256(merchantCode + order_id + amount + privateKey)
        const signatureString = `${merchantCode}${order_id}${amount}${privateKey}`;
        const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

        // 3. SUSUN PAYLOAD SESUAI DOKUMENTASI XOFTWARE
        const payload = {
            method: 'QRIS',
            merchant_ref: order_id,
            amount: amount,
            customer_name: customer_name,
            customer_email: 'buyer@au2hub.com', // Dummy email jika diwajibkan
            signature: signature,
            order_items: [
                {
                    name: product_name,
                    price: amount,
                    quantity: 1
                }
            ]
        };

        // 4. TEMBAK KE SERVER XOFTWARE
        const response = await fetch('https://pay.xoftware.id/api/transaction/create', { // Cek URL pastinya di docs
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Cek apakah Xoftware pakai Bearer atau Header khusus
            },
            body: JSON.stringify(payload)
        });

        const dataXoftware = await response.json();

        // 5. KEMBALIKAN STRING QRIS KE FRONTEND
        if (dataXoftware.success) {
            return res.status(200).json({
                success: true,
                qris_string: dataXoftware.data.qr_string // Sesuaikan dengan key response Xoftware
            });
        } else {
            throw new Error(dataXoftware.message || 'Gagal dari sisi Gateway');
        }

    } catch (error) {
        console.error("QRIS Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
