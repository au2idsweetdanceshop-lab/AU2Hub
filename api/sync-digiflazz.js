import crypto from 'crypto';
// Import Supabase Client Anda di sini

export default async function handler(req, res) {
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_KEY;
    const sign = crypto.createHash('md5').update(username + apiKey + "depo").digest('hex');

    // 1. Minta daftar harga prabayar via VPS
    const response = await fetch('http://203.194.114.209:3000/proxy-digiflazz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            target_url: 'https://api.digiflazz.com/v1/price-list',
            payload: { cmd: "prepaid", username: username, sign: sign }
        })
    });

    const result = await response.json();
    
    // 2. Olah data: Tambahkan margin keuntungan Anda
    const products = result.data.map(item => ({
        sku_code: item.buyer_sku_code,
        product_name: item.product_name,
        category: item.category,
        brand: item.brand,
        price: item.price,
        seller_price: item.price + 500, // Contoh: Tambah untung Rp 500 per produk
        buyer_product_status: item.buyer_product_status
    }));

    // 3. Simpan/Update Massal ke Supabase
    const { error } = await supabase.from('digiflazz_products').upsert(products);

    res.status(200).json({ message: "Produk berhasil disinkronisasi!", total: products.length });
}
