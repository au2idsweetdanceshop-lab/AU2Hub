export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';
    
    // Identitas slug unik toko kamu sesuai link web.xoftware.id/warungputri
    const storeSlug = 'warungputri'; 

    // --- FITUR OTOMATIS: Meneruskan nomor HP (&sender=...) dari luar ke server pusat ---
    const urlParams = new URLSearchParams(req.query);
    urlParams.delete('action');
    const sisaQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';

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
            // Alamat otomatis ditempeli nomor hp pengirim jika ada
            targetUrl = `${baseUrl}/store/profile${sisaQuery}`; 
            options.method = 'GET';
        } 
        else if (action === 'produk') {
            targetUrl = `${baseUrl}/store/${storeSlug}/products${sisaQuery}`; 
            options.method = 'GET';
        } 
        else if (action === 'order') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            targetUrl = `${baseUrl}/order`;
            options.method = 'POST';
            options.body = JSON.stringify(req.body);
        } 
        else if (action === 'qris') {
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
