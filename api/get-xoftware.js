export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';

    // Nomor utama kamu yang tertera di dashboard
    const defaultSender = '6282297652028'; 

    let options = {
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
        }
    };

    try {
        let targetUrl = '';
        let bodyData = {};

        if (req.method === 'POST' && req.body) {
            bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        if (action === 'saldo') {
            targetUrl = `${baseUrl}/user?sender=${bodyData.sender || defaultSender}`;
            options.method = 'GET';
        } 
        else if (action === 'produk') {
            targetUrl = `${baseUrl}/product`;
            options.method = 'GET';
        } 
        else if (action === 'register') {
            // SENJATA RAHASIA (Foto 52061.jpg): Daftarkan user baru langsung lewat API
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/register`;
            options.method = 'POST';
            options.body = JSON.stringify({
                sender: bodyData.sender || defaultSender,
                name: bodyData.name || 'Pelanggan AU2Hub'
            });
        }
        else if (action === 'order') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/order/balance`;
            options.method = 'POST';
            options.body = JSON.stringify({
                sender: bodyData.sender || defaultSender,
                code: bodyData.product_code || bodyData.code,
                quantity: parseInt(bodyData.quantity || 1)
            });
        } 
        else if (action === 'qris') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            
            const produkCode = bodyData.product_code || bodyData.code;
            
            if (produkCode) {
                targetUrl = `${baseUrl}/order/qris`;
                options.method = 'POST';
                options.body = JSON.stringify({
                    sender: bodyData.sender || defaultSender,
                    code: produkCode,
                    quantity: parseInt(bodyData.quantity || 1)
                });
            } else {
                targetUrl = `${baseUrl}/deposit`;
                options.method = 'POST';
                options.body = JSON.stringify({
                    sender: bodyData.sender || defaultSender,
                    amount: parseInt(bodyData.amount || bodyData.nominal || 0)
                });
            }
        } 
        else {
            return res.status(400).json({ status: false, message: 'Action request tidak dikenali' });
        }

        const response = await fetch(targetUrl, options);
        const data = await response.json();
        
        return res.status(200).json(data);

    } catch (error) {
        console.error(`Xoftware API Error [${action}]:`, error);
        return res.status(500).json({ status: false, message: 'Gagal terhubung dengan server pusat Xoftware' });
    }
}
