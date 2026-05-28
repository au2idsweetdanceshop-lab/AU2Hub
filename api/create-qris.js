import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, amount, product_name, customer_name } = req.body;

    // 1. TARIK DATA DARI VERCEL
    const merchantId = process.env.XOFTWARE_MERCHANT_ID;
    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         

    try {
        // 2. SUSUN PAYLOAD
        const payload = {
            merchant_id: parseInt(merchantId), 
            channel_code: "QRIS", 
            amount: parseInt(amount), 
            ref_id: order_id, 
            fee_direction: "merchant", 
            notify_url: "https://www.au2idsweetdance.com/api/webhook", 
            note: `Pembayaran: ${product_name}`, 
            metadata: {
                customer: {
                    name: customer_name || "Player AU2Hub" 
                }
            }
        };

        const payloadString = JSON.stringify(payload);
        
        // 3. ATURAN BARU: WAKTU UNIX DALAM DETIK
        const timestamp = Math.floor(Date.now() / 1000).toString();

        // 4. ATURAN BARU: RUMUS RAHASIA SIGNATURE XOFTWARE
        const method = 'POST';
        const path = '/v1/api/transactions';
        // Format gabungan: TIMESTAMP \n HTTP_METHOD \n REQUEST_PATH \n RAW_JSON_BODY
        const messageToSign = `${timestamp}\n${method}\n${path}\n${payloadString}`;

        const signature = crypto
            .createHmac('sha256', apiKey)
            .update(messageToSign, 'utf8')
            .digest('base64'); // <--- Diubah jadi base64 sesuai dokumen

        // 5. TEMBAK KE SERVER XOFTWARE
        const response = await fetch(`${baseUrl}${path}`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,             
                'X-Timestamp': timestamp,        // Menggunakan Unix Timestamp (Detik)
                'X-Signature': signature         // Menggunakan Base64 Hash
            },
            body: payloadString
        });

        // Tangkap response dari Xoftware
        let dataXoftware;
        try {
            dataXoftware = await response.json();
        } catch (err) {
            const textErr = await response.text();
            throw new Error(`Respons server Xoftware tidak valid: ${textErr}`);
        }

        // 6. KEMBALIKAN STRING QRIS KE FRONTEND
        if (response.ok && dataXoftware.status === "PENDING") { 
            return res.status(200).json({
                success: true,
                qris_string: dataXoftware.qris_text 
            });
        } else {
            throw new Error(dataXoftware.message || JSON.stringify(dataXoftware) || 'Gagal membuat QRIS dari Gateway Xoftware');
        }

    } catch (error) {
        console.error("QRIS Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
