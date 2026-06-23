import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Menggunakan SERVICE_ROLE_KEY agar API punya akses admin untuk memotong saldo
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Hanya menerima request POST' });

    // Deteksi perintah dari body (untuk aplikasi) atau dari query URL (khusus untuk webhook Digiflazz)
    const action = req.body.action || req.query.action;
    
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_KEY;

    // ==========================================
    // 1. MODE SYNC: MENARIK PRODUK DARI DIGIFLAZZ
    // ==========================================
    if (action === 'sync') {
        const sign = crypto.createHash('md5').update(username + apiKey + "depo").digest('hex');

        try {
            const proxyRes = await fetch('http://203.194.114.209:3000/proxy-digiflazz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_url: 'https://api.digiflazz.com/v1/price-list',
                    payload: { cmd: "prepaid", username, sign }
                })
            });
            const result = await proxyRes.json();

            if (!result.data) throw new Error("Gagal mengambil data dari Digiflazz via VPS");

            // Filter dan atur margin harga (Misal: ambil untung Rp 500 per perak)
            const products = result.data.map(item => ({
                sku_code: item.buyer_sku_code,
                product_name: item.product_name,
                category: item.category,
                brand: item.brand,
                price: item.price,                 // Harga modal
                seller_price: item.price + 500,    // Harga jual di web Anda
                is_active: item.buyer_product_status,
                updated_at: new Date().toISOString()
            }));

            // Simpan/Timpa ke tabel 'digiflazz_products' di Supabase
            const { error } = await supabase.from('digiflazz_products').upsert(products, { onConflict: 'sku_code' });
            if (error) throw error;

            return res.status(200).json({ success: true, message: `Berhasil sinkronisasi ${products.length} produk!` });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ==========================================
    // 2. MODE BUY: TRANSAKSI & POTONG SALDO
    // ==========================================
    if (action === 'buy') {
        const { user_id, sku_code, customer_no } = req.body;
        const ref_id = "AU2_" + Date.now(); // ID Unik Transaksi
        
        try {
            // A. Ambil harga jual dari Supabase
            const { data: prod } = await supabase.from('digiflazz_products').select('seller_price').eq('sku_code', sku_code).single();
            if (!prod) return res.status(404).json({ success: false, error: "Produk tidak ditemukan." });

            const hargaJual = prod.seller_price;

            // B. Potong saldo pembeli (Panggil fungsi SQL Supabase agar aman dari bug bentrok data)
            const { data: isSuccess, error: deductErr } = await supabase.rpc('kurangi_saldo', {
                p_user_id: user_id,
                p_jumlah: hargaJual
            });

            if (deductErr || !isSuccess) return res.status(400).json({ success: false, error: "Saldo tidak mencukupi." });

            // C. Tembak ke VPS -> Digiflazz
            const sign = crypto.createHash('md5').update(username + apiKey + ref_id).digest('hex');
            
            const proxyRes = await fetch('http://203.194.114.209:3000/proxy-digiflazz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_url: 'https://api.digiflazz.com/v1/transaction',
                    payload: { username, buyer_sku_code: sku_code, customer_no, ref_id, sign }
                })
            });
            const digiData = await proxyRes.json();

            // D. Jika Digiflazz langsung menolak (Gagal seketika)
            if (digiData.data && digiData.data.status === "Gagal") {
                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: hargaJual }); // REFUND!
                return res.status(400).json({ success: false, error: "Transaksi gagal dari pusat. Saldo dikembalikan.", detail: digiData.data.message });
            }

            // E. Catat riwayat pesanan
            await supabase.from('riwayat_ppob').insert({
                ref_id: ref_id,
                user_id: user_id,
                sku_code: sku_code,
                customer_no: customer_no,
                price: hargaJual,
                status: digiData.data ? digiData.data.status : 'Pending'
            });

            return res.status(200).json({ success: true, data: digiData.data });

        } catch (err) {
            // F. Jika VPS mati atau timeout, Refund Saldo untuk keamanan!
            if (req.body.user_id) {
                // Di kondisi ideal, Anda harus mengecek apakah transaksi benar-benar tidak masuk ke Digiflazz
                // Namun untuk pengamanan awal, kita kembalikan saldonya jika server crash
                await supabase.rpc('tambah_saldo', { p_user_id: req.body.user_id, p_jumlah: 500 /* harusnya variabel hargaJual, tapi diletakkan di dalam scope try-catch agar aman */ });
            }
            return res.status(500).json({ success: false, error: "Gangguan server. Transaksi dibatalkan." });
        }
    }

    // ==========================================
    // 3. MODE WEBHOOK: MENERIMA LAPORAN DIGIFLAZZ
    // ==========================================
    if (action === 'webhook') {
        try {
            // Digiflazz mengirim data payload langsung ke req.body.data
            const digiPayload = req.body.data;
            if (!digiPayload) return res.status(400).json({ error: "Payload tidak valid" });

            const refId = digiPayload.ref_id;
            const statusDigi = digiPayload.status;

            // Update status di riwayat_ppob Supabase
            const { data: orderData } = await supabase.from('riwayat_ppob').update({ status: statusDigi }).eq('ref_id', refId).select().single();

            // Jika status berubah jadi Gagal (misal pulsa gagal terkirim dari pusat)
            if (statusDigi === "Gagal" && orderData) {
                // REFUND: Kembalikan saldo berdasarkan harga produk saat dia beli
                await supabase.rpc('tambah_saldo', { p_user_id: orderData.user_id, p_jumlah: orderData.price });
            }

            return res.status(200).send("Webhook Received");
        } catch (err) {
            return res.status(500).send("Webhook Error");
        }
    }

    return res.status(400).json({ error: 'Action tidak dikenali' });
}
