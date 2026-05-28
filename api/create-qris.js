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
        
        // --- 3. BUAT TIMESTAMP SAAT INI (TAMBAHAN BARU) ---
        // Membuat waktu saat ini dengan format ISO 8601 (Standar API)
        const timestamp = new Date().toISOString(); 

        // 4. BUAT SIGNATURE (HMAC-SHA256)
        const signature = crypto
            .createHmac('sha256', apiKey)
            .update(payloadString)
            .digest('hex');

        // 5. TEMBAK KE SERVER XOFTWARE
        const response = await fetch(`${baseUrl}/v1/api/transactions`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,             
                'X-Timestamp': timestamp,        // <--- FIX: Tambahkan Header X-Timestamp di sini!
                'X-Signature': signature,        
                'Authorization': `Bearer ${apiKey}` 
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
