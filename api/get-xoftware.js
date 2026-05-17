export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';

    // ⚠️ GANTI DENGAN NOMOR WA YANG TERDAFTAR DI AKUN XOFTWARE KAMU ⚠️
    const defaultSender = '345937'; 

    let options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey
        }
    };

    try {
        let targetUrl = '';
        let bodyData = {};

        // Parse data body dari frontend jika ada
        if (req.method === 'POST' && req.body) {
            bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }

        if (action === 'saldo') {
            // Cek saldo berdasarkan Nomor WA (Sender)
            targetUrl = `${baseUrl}/user?sender=${defaultSender}`;
            options.method = 'GET';
        } 
        else if (action === 'produk') {
            // Sesuai Dokumentasi Foto 52060.jpg
            targetUrl = `${baseUrl}/product`;
            options.method = 'GET';
        } 
        else if (action === 'order') {
            // Sesuai Dokumentasi Foto 52063.jpg (Pembelian Potong Saldo)
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/order/balance`;
            options.method = 'POST';
            
            // Format wajib: sender, code, quantity
            options.body = JSON.stringify({
                sender: bodyData.sender || defaultSender,
                code: bodyData.product_code || bodyData.code,
                quantity: parseInt(bodyData.quantity || 1)
            });
        } 
        else if (action === 'qris') {
            // Sesuai Dokumentasi Foto 52065.jpg (Request Deposit QRIS)
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/deposit`;
            options.method = 'POST';
            
            // Format wajib: sender, amount
            options.body = JSON.stringify({
                sender: bodyData.sender || defaultSender,
                amount: parseInt(bodyData.amount || bodyData.nominal || 0)
            });
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
