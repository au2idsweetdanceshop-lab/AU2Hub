export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';

    // Konfigurasi Header Standar sesuai dokumentasi Xoftware kamu
    let options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey
        }
    };

    try {
        let targetUrl = '';

        if (action === 'saldo') {
            // 1. Cek Saldo & Informasi Pengguna (Data No. 4)
            targetUrl = `${baseUrl}/profile`;
            options.method = 'GET';
        } 
        else if (action === 'produk') {
            // 2. Tarik Seluruh Produk Tokomu / WarungPutri (Data No. 2)
            targetUrl = `${baseUrl}/products`;
            options.method = 'GET';
        } 
        else if (action === 'order') {
            // 3. Transaksi Pembelian Langsung Potong Saldo (Data No. 5)
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/order`;
            options.method = 'POST';
            options.body = JSON.stringify(req.body);
        } 
        else if (action === 'qris') {
            // 4. Request Pembuatan Invoice Deposit QRIS Otomatis (Data No. 6)
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/deposit/qris`;
            options.method = 'POST';
            options.body = JSON.stringify(req.body);
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
