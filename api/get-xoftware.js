export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';

    // Nomor utama kamu yang terdaftar di dashboard
    const defaultSender = '6282297652028'; 

    let options = {
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        }
    };

    try {
        let bodyData = {};
        if (req.method === 'POST' && req.body) {
            bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        // =================================================================
        // JALUR RADAR KHUSUS SALDO / PROFIL
        // =================================================================
        if (action === 'saldo') {
            const ruteSaldo = ['/profile', '/balance', '/user/profile', '/user/info', '/member', '/info'];
            let dataSaldo = null;

            for (const path of ruteSaldo) {
                const targetUrl = `${baseUrl}${path}?sender=${bodyData.sender || defaultSender}`;
                try {
                    const response = await fetch(targetUrl, { method: 'GET', headers: options.headers });
                    const resData = await response.json();
                    let errStr = (resData.error || resData.message || "").toLowerCase();

                    if (resData.status === true || (errStr && !errStr.includes('not found'))) {
                        dataSaldo = resData;
                        break; // Alamat ketemu! Berhenti looping.
                    }
                } catch (e) {
                    // Abaikan jika error jaringan, coba rute selanjutnya
                }
            }
            return res.status(200).json(dataSaldo || { status: false, message: "Seluruh rute saldo dicoba namun tidak ditemukan." });
        } 
        
        // =================================================================
        // JALUR RESMI (SESUAI DOKUMENTASI)
        // =================================================================
        else if (action === 'produk') {
            const response = await fetch(`${baseUrl}/product`, { method: 'GET', headers: options.headers });
            const data = await response.json();
            return res.status(200).json(data);
        } 
        else if (action === 'order') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            const response = await fetch(`${baseUrl}/order/balance`, {
                method: 'POST',
                headers: options.headers,
                body: JSON.stringify({
                    sender: bodyData.sender || defaultSender,
                    code: bodyData.product_code || bodyData.code,
                    quantity: parseInt(bodyData.quantity || 1)
                })
            });
            const data = await response.json();
            return res.status(200).json(data);
        } 
        else if (action === 'qris') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            
            const produkCode = bodyData.product_code || bodyData.code;
            let targetUrl = produkCode ? `${baseUrl}/order/qris` : `${baseUrl}/deposit`;
            
            let payload = produkCode ? {
                sender: bodyData.sender || defaultSender,
                code: produkCode,
                quantity: parseInt(bodyData.quantity || 1)
            } : {
                sender: bodyData.sender || defaultSender,
                amount: parseInt(bodyData.amount || bodyData.nominal || 0)
            };

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: options.headers,
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            return res.status(200).json(data);
        } 
        else {
            return res.status(400).json({ status: false, message: 'Action request tidak dikenali' });
        }

    } catch (error) {
        return res.status(500).json({ status: false, message: 'Gagal terhubung dengan server pusat Xoftware' });
    }
}
