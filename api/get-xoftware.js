export default async function handler(req, res) {
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key Xoftware belum dikonfigurasi di Vercel' });
    }

    const { action } = req.query;
    const baseUrl = 'https://backend.xoftware.id/v1';
    const storeSlug = 'warungputri'; 

    // Konfigurasi Header Resmi sesuai dokumentasi Xoftware
    let options = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey
        }
    };

    // Otomatis amankan dan teruskan nomor HP (&sender=...) dari frontend ke server pusat
    const urlParams = new URLSearchParams(req.query);
    urlParams.delete('action');
    const sisaQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';

    try {
        // Jalankan jalur transaksi POST langsung tanpa perlu looping
        if (action === 'order') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            const response = await fetch(`${baseUrl}/order`, { ...options, method: 'POST', body: JSON.stringify(req.body) });
            return res.status(200).json(await response.json());
        } 
        if (action === 'qris') {
            if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method must be POST' });
            const response = await fetch(`${baseUrl}/deposit/qris`, { ...options, method: 'POST', body: JSON.stringify(req.body) });
            return res.status(200).json(await response.json());
        }

        // =================================================================
        // SISTEM AUTO-TRY RADAR (Mencari Rute Jalan yang Valid Otomatis)
        // =================================================================
        let ruteYangDicoba = [];
        if (action === 'saldo') {
            ruteYangDicoba = ['/balance', '/user', '/store/profile', '/merchant/profile', '/profile'];
        } else if (action === 'produk') {
            ruteYangDicoba = ['/services', '/product', '/products', `/store/${storeSlug}/products`, '/pricelist'];
        } else {
            return res.status(400).json({ status: false, message: 'Action request tidak dikenali' });
        }

        let dataAkhir = null;

        // Looping otomatis menguji rute satu per satu sampai jebol tembus
        for (const path of ruteYangDicoba) {
            const targetUrl = `${baseUrl}${path}${sisaQuery}`;
            try {
                const response = await fetch(targetUrl, { ...options, method: 'GET' });
                const resData = await response.json();
                
                // Jika responnya sukses atau mengeluarkan error aslinya (bukan salah alamat/not found)
                if (resData.status === true || (resData.error && !resData.error.includes('not found'))) {
                    dataAkhir = resData;
                    break; // Rute bener ketemu! Stop looping dan langsung kirim ke frontend
                }
                dataAkhir = resData; // Simpan rute terakhir buat jaga-jaga kalau gagal semua
            } catch (e) {
                // Jika gangguan koneksi di salah satu rute, abaikan dan lanjut rute berikutnya
            }
        }

        return res.status(200).json(dataAkhir);

    } catch (error) {
        console.error(`Xoftware API Error [${action}]:`, error);
        return res.status(500).json({ status: false, message: 'Gagal terhubung dengan server pusat Xoftware' });
    }
}
