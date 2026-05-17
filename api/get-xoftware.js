export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';

    let options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey
        }
    };

    try {
        let ruteYangDicoba = [];
        let method = 'GET';
        let requestBody = null;

        // ⚠️ NOMOR WA TERDAFTAR DI XOFTWARE (WAJIB BENAR) ⚠️
        const nomorTerdaftar = '9647808097471'; 

        // Amankan data yang dikirim dan paksa nominal jadi "Angka"
        if (req.method === 'POST' && req.body) {
            let bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            let uangMurni = parseInt(bodyData.amount || bodyData.nominal || bodyData.price || 0);
            
            requestBody = JSON.stringify({
                ...bodyData,
                amount: uangMurni,
                sender: bodyData.sender || nomorTerdaftar
            });
        }

        // Tentukan daftar rute rahasia yang akan ditembak otomatis
        if (action === 'saldo') {
            ruteYangDicoba = [`/balance?sender=${nomorTerdaftar}`, '/balance', `/user?sender=${nomorTerdaftar}`];
        } else if (action === 'produk') {
            // Rute ini yang terbukti sukses narik semua katalog produkmu kemarin!
            ruteYangDicoba = ['/services', '/products', '/product', '/pricelist'];
        } else if (action === 'order') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            ruteYangDicoba = ['/order', '/transaction'];
            method = 'POST';
        } else if (action === 'qris') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            // Rute ini yang tadi sukses di screenshot kamu! (/deposit)
            ruteYangDicoba = ['/deposit', '/qris', '/payment/qris'];
            method = 'POST';
        } else {
            return res.status(400).json({ status: false, message: 'Action request tidak dikenali' });
        }

        let dataAkhir = null;

        // Mesin penembak otomatis
        for (const path of ruteYangDicoba) {
            const targetUrl = `${baseUrl}${path}`;
            try {
                let fetchOptions = { ...options, method: method };
                if (requestBody) fetchOptions.body = requestBody;

                const response = await fetch(targetUrl, fetchOptions);
                const resData = await response.json();
                
                let errStr = (resData.error || resData.message || "").toLowerCase();

                // Jika sukses ATAU errornya BUKAN "not found" (Artinya alamat aslinya ketemu)
                if (resData.status === true || (errStr && !errStr.includes('not found'))) {
                    dataAkhir = resData; 
                    break; 
                }
                dataAkhir = resData;
            } catch (e) {
                // Abaikan kalau error jaringan, lanjut coba rute sebelah
            }
        }

        return res.status(200).json(dataAkhir || { status: false, message: "Gagal menemukan rute API yang valid." });

    } catch (error) {
        return res.status(500).json({ status: false, message: 'Gagal terhubung dengan server pusat Xoftware' });
    }
}
