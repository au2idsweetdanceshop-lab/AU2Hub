export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';
    const storeSlug = 'warungputri'; 

    let options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey
        }
    };

    const urlParams = new URLSearchParams(req.query);
    urlParams.delete('action');
    const sisaQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';

    try {
        let targetUrl = '';

        if (action === 'saldo') {
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
            
            // ALAMAT ASLI KETEMU: /deposit
            targetUrl = `${baseUrl}/deposit`;
            options.method = 'POST';
            
            let bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            let uangMurni = parseInt(bodyData.amount || 0);

            // ⚠️ GANTI NOMOR INI DENGAN NOMOR WA YANG TERDAFTAR DI XOFTWARE KAMU ⚠️
            let nomorTerdaftar = '9647808097471'; 

            options.body = JSON.stringify({
                amount: uangMurni,
                sender: bodyData.sender || nomorTerdaftar
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
