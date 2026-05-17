export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';
    
    // Identitas slug unik toko kamu sesuai link web.xoftware.id/warungputri
    const storeSlug = 'warungputri'; 

    // Konfigurasi Header Resmi sesuai dokumentasi Xoftware
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
            // SULAM RUTE: Diubah dari /store/profile menjadi /balance (Rute umum cek saldo)
            targetUrl = `${baseUrl}/balance`; 
            options.method = 'GET';
        } 
        else if (action === 'produk') {
            // SULAM RUTE: Diubah menjadi /services (Rute umum penarikan daftar produk H2H)
            targetUrl = `${baseUrl}/services`; 
            options.method = 'GET';
        } 
        else if (action === 'order') {
            // Transaksi Pembelian Langsung Potong Saldo (Data No. 5)
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/order`;
            options.method = 'POST';
            options.body = JSON.stringify(req.body);
        } 
        else if (action === 'qris') {
            // Request Pembuatan Barcode QRIS Otomatis (Data No. 6)
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
