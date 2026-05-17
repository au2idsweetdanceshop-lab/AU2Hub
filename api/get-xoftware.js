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
        let ruteYangDicoba = [];
        let method = 'GET';
        let requestBody = null;
        let payloadSuper = null;

        // BOM PARAMETER: Kirim semua variasi nama uang biar server Xoftware gak bisa ngeles!
        if (req.method === 'POST' && req.body) {
            let bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            let uangMurni = parseInt(bodyData.amount || bodyData.nominal || bodyData.price || 0);
            
            payloadSuper = {
                ...bodyData,
                amount: uangMurni,
                nominal: uangMurni,
                price: uangMurni,
                total_price: uangMurni,
                sender: bodyData.sender || '6283815584661'
            };
            requestBody = JSON.stringify(payloadSuper);
        }

        if (action === 'saldo') {
            ruteYangDicoba = ['/store/profile', '/balance', '/user', '/merchant/profile'];
        } else if (action === 'produk') {
            ruteYangDicoba = [`/store/${storeSlug}/products`, '/services', '/product', '/products'];
        } else if (action === 'order') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            ruteYangDicoba = ['/order', '/transaction', '/buy', '/checkout'];
            method = 'POST';
        } else if (action === 'qris') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            // Rute pencarian QRIS diperluas ke semua kemungkinan
            ruteYangDicoba = ['/deposit', '/deposit/request', '/qris', '/qris/request', '/payment/qris', '/deposit/qris'];
            method = 'POST';
        } else {
            return res.status(400).json({ status: false, message: 'Action request tidak dikenali' });
        }

        let riwayatDebug = {}; 

        for (const path of ruteYangDicoba) {
            const targetUrl = `${baseUrl}${path}${method === 'GET' ? sisaQuery : ''}`;
            try {
                let fetchOptions = { ...options, method: method };
                if (requestBody) fetchOptions.body = requestBody;

                const response = await fetch(targetUrl, fetchOptions);
                const resData = await response.json();
                
                // Jika SUKSES (Barcode tercipta atau Produk Muncul)
                if (resData.status === true) {
                    return res.status(200).json(resData); 
                }
                
                let errStr = (resData.error || resData.message || "").toLowerCase();

                // Jika server merespon Gagal BUKAN karena salah alamat (Berarti ini Endpoint Aslinya!)
                if (errStr && !errStr.includes('not found')) {
                    return res.status(200).json(resData); 
                }
                
                riwayatDebug[path] = resData; 
            } catch (e) {
                riwayatDebug[path] = "Fetch Error/Jaringan";
            }
        }

        // Kalau mentok "Not Found" semua, munculkan hasil investigasinya!
        return res.status(200).json({ 
            status: false, 
            message: "Semua alamat API dicoba namun gagal. Cek debug_info.", 
            debug_info: riwayatDebug,
            payload_dikirim: payloadSuper
        });

    } catch (error) {
        return res.status(500).json({ status: false, message: 'Gagal terhubung ke Vercel' });
    }
}
