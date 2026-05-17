export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';

    // Kunci nomor utama format 62 yang sudah terbukti terdaftar di dashboard kamu
    const defaultSender = '6282297652028'; 

    // SAKTI: Sesuai Foto 52059.jpg, HAPUS 'Authorization Bearer' agar server tidak bingung dan memicu "User not found"
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
            
            options.body = JSON.stringify({
                sender: bodyData.sender || defaultSender,
                code: bodyData.product_code || bodyData.code,
                quantity: parseInt(bodyData.quantity || 1)
            });
        } 
        else if (action === 'qris') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            
            const produkCode = bodyData.product_code || bodyData.code;
            
            // JALUR A: Jika frontend mengirim kode produk, pakai rute PEMBELIAN PRODUK VIA QRIS (Foto 52064.jpg)
            if (produkCode) {
                targetUrl = `${baseUrl}/order/qris`;
                options.method = 'POST';
                options.body = JSON.stringify({
                    sender: bodyData.sender || defaultSender,
                    code: produkCode,
                    quantity: parseInt(bodyData.quantity || 1)
                });
            } 
            // JALUR B: Jika hanya mengirim uang/nominal, pakai rute REQUEST DEPOSIT SALDO (Foto 52065.jpg)
            else {
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
