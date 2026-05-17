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
        // =================================================================
        // SISTEM AUTO-TRY RADAR V3 (Anti-Bug Stringify & Payload Ganda)
        // =================================================================
        let ruteYangDicoba = [];
        let method = 'GET';
        let requestBody = null;

        // Amankan dan gandakan parameter payload untuk mengecoh sistem API
        if (req.method === 'POST' && req.body) {
            // Cek apakah Vercel merusak format jadi string, jika iya kita perbaiki
            let bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            
            // Tembak 2 parameter sekaligus (amount & nominal) biar server sana nggak bingung
            if(bodyData.amount) bodyData.nominal = bodyData.amount;
            if(bodyData.nominal) bodyData.amount = bodyData.nominal;
            
            // Pasang identitas WA pengirim cadangan biar nggak error "Sender Required"
            bodyData.sender = bodyData.sender || '6283815584661'; 
            
            requestBody = JSON.stringify(bodyData);
        }

        if (action === 'saldo') {
            ruteYangDicoba = ['/balance', '/user', '/store/profile', '/merchant/profile', '/profile'];
        } else if (action === 'produk') {
            ruteYangDicoba = ['/services', '/product', '/products', `/store/${storeSlug}/products`, '/pricelist'];
        } else if (action === 'order') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            ruteYangDicoba = ['/order', '/transaction', '/buy', '/checkout'];
            method = 'POST';
        } else if (action === 'qris') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            ruteYangDicoba = ['/deposit', '/qris', '/payment/qris', '/deposit/qris', '/topup', '/topup/qris'];
            method = 'POST';
        } else {
            return res.status(400).json({ status: false, message: 'Action request tidak dikenali' });
        }

        let dataAkhir = null;

        for (const path of ruteYangDicoba) {
            const targetUrl = `${baseUrl}${path}${sisaQuery}`;
            try {
                let fetchOptions = { ...options, method: method };
                if (requestBody) fetchOptions.body = requestBody;

                const response = await fetch(targetUrl, fetchOptions);
                const resData = await response.json();
                
                // Jika sukses ATAU errornya bukan "not found" (alias ketemu jalannya)
                if (resData.status === true || (resData.error && !resData.error.toLowerCase().includes('not found'))) {
                    dataAkhir = resData;
                    break; 
                }
                dataAkhir = resData; 
            } catch (e) {
                // Abaikan kalau gagal jaringan, pindah tembak alamat berikutnya
            }
        }

        return res.status(200).json(dataAkhir || { status: false, message: "Semua kombinasi rute dicoba namun gagal." });

    } catch (error) {
        console.error(`Xoftware API Error [${action}]:`, error);
        return res.status(500).json({ status: false, message: 'Gagal terhubung dengan server pusat Xoftware' });
    }
}
