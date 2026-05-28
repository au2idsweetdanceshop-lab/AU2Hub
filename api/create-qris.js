import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, amount, product_name, customer_name } = req.body;

    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         

    try {
        // SUSUN PAYLOAD
        const payload = {
            merchant_id: 129, 
            channel_code: "QRIS", 
            amount: parseInt(amount), 
            ref_id: order_id, 
            fee_direction: "merchant", 
            // 👇 INI KUNCINYA: Link webhook sudah bersih dari www
            notify_url: "https://au2idsweetdance.com/api/webhook", 
            note: `Pembayaran: ${product_name}`, 
            metadata: {
                customer: {
                    id: "CUST-" + Date.now().toString().slice(-6),
                    name: customer_name || "Player AU2Hub",
                    phone: "081234567890",
                    email: "buyer@au2hub.com"
                },
                products: [
                    {
                        product_code: "ITEM-001",
                        product_name: product_name || "Produk AU2Hub",
                        product_thumbnail: "https://placehold.co/100x100/1a1133/ff007a?text=Item",
                        // 👇 Link ini juga sudah dibersihkan dari www
                        product_url: "https://au2idsweetdance.com"
                    }
                ]
            }
        };

        const payloadString = JSON.stringify(payload);
        
        // WAKTU UNIX
        const timestamp = Math.floor(Date.now() / 1000).toString();

        // SIGNATURE
        const method = 'POST';
        const path = '/v1/api/transactions';
        const messageToSign = `${timestamp}\n${method}\n${path}\n${payloadString}`;

        const signature = crypto
            .createHmac('sha256', apiKey)
            .update(messageToSign, 'utf8')
            .digest('base64'); 

        // TEMBAK API
        const response = await fetch(`${baseUrl}${path}`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,             
                'X-Timestamp': timestamp,        
                'X-Signature': signature         
            },
            body: payloadString
        });

        const dataXoftware = await response.json();

        // --- FIX FINAL: PENANGKAP RESPONS ANTI-GAGAL ---
        // Kita cari string QRIS-nya, entah itu ditaruh di luar atau dibungkus di dalam "data"
        const qrisString = dataXoftware.qris_text || (dataXoftware.data && dataXoftware.data.qris_text);

        // Jika string QRIS-nya ketemu, kirim ke frontend!
        if (qrisString) {
            return res.status(200).json({
                success: true,
                qris_string: qrisString 
            });
        } else {
            // Kalau misal QRIS tetep ga ketemu, munculin wujud asli JSON-nya biar kita tau letaknya di mana
            throw new Error(`Berhasil masuk, tapi QRIS ngumpet: ${JSON.stringify(dataXoftware)}`);
        }

    } catch (error) {
        console.error("QRIS Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
