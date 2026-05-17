export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const baseUrl = 'https://backend.xoftware.id/v1';
    const defaultSender = '6282297652028'; 

    // DETEKSI UTAMA MODE UNIVERSAL DEBUG (Bisa ditembak dinamis dari Console Eruda)
    const { action, debug_path, debug_method } = req.query;

    let options = {
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        }
    };

    // =================================================================
    // 🛠️ MODE UNIVERSAL DEBUG (Fitur Eksekusi Instan dari HP)
    // =================================================================
    if (debug_path) {
        try {
            options.method = debug_method || 'GET';
            if (req.method === 'POST' && req.body) {
                let bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
                options.body = JSON.stringify(bodyData);
            }
            const response = await fetch(`${baseUrl}${debug_path}`, options);
            const data = await response.json();
            return res.status(200).json({ mode: "Universal Debug", path: debug_path, method: options.method, response: data });
        } catch (e) {
            return res.status(500).json({ mode: "Universal Debug", error: e.message });
        }
    }

    // =================================================================
    // 🛒 JALUR PRODUKSI (Biar Website Kamu Tetap Berfungsi Normal)
    // =================================================================
    try {
        let bodyData = {};
        if (req.method === 'POST' && req.body) {
            bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        if (action === 'produk') {
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
        else if (action === 'saldo') {
            // Kita return pesan petunjuk sementara rute aslinya kita cari via console
            return res.status(200).json({ status: false, message: "Gunakan Script Uji Coba Massal di Console Eruda." });
        }
        else {
            return res.status(400).json({ status: false, message: 'Action request tidak dikenali' });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: 'Gagal terhubung dengan server' });
    }
}
