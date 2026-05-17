export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';
    const storeSlug = 'warungputri'; 

    // Konfigurasi Header Resmi
    let options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey
        }
    };

    try {
        let targetUrl = '';

        // Otomatis salin dan teruskan parameter tambahan dari frontend (seperti sender, id, dll)
        const queryParams = new URLSearchParams(req.query);
        queryParams.delete('action'); // Hapus keyword action agar tidak ikut terkirim ke pusat
        const extraParams = queryParams.toString() ? `?${queryParams.toString()}` : '';

        if (action === 'saldo') {
            // Rute cek saldo otomatis ditempel dengan parameter tambahan (?sender=xxx)
            targetUrl = `${baseUrl}/balance${extraParams}`; 
            options.method = 'GET';
        } 
        else if (action === 'produk') {
            targetUrl = `${baseUrl}/services${extraParams}`; 
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
