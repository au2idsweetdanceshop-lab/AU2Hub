import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Menggunakan SERVICE_ROLE_KEY agar API punya akses admin untuk memotong saldo
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // 🔥 PERBAIKAN: Izinkan POST dan GET (Karena robot Vercel Cron menggunakan GET)
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    // Tangkap action dengan aman baik dari body (POST) maupun URL (GET)
    const action = (req.body && req.body.action) || req.query.action;
    
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_KEY;

    // ==========================================
    // 1. MODE SYNC: TARIK PRODUK (TERMURAH & TERBAIK) + SAPU BERSIH ZOMBIE
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

            // 🔥 LOGIKA TERCEPAT & TERBAIK: Saring hanya produk yang 100% Normal
            const produkTerbaik = result.data.filter(item => 
                item.buyer_product_status === true && 
                item.seller_product_status === true
            );

            // 🔥 1. CATAT WAKTU SYNC SAAT INI UNTUK PATOKAN SAPU BERSIH
            const waktuSync = new Date().toISOString();

            // 🔥 2. Atur margin Rp 100 perak & sematkan stempel waktu
            const products = produkTerbaik.map(item => ({
                sku_code: item.buyer_sku_code,
                product_name: item.product_name,
                category: item.category,
                brand: item.brand,
                price: item.price,                 // Harga modal
                seller_price: item.price + 100,    // KEUNTUNGAN RP 100 PERAK
                is_active: true,                   // Pasti true karena difilter di atas
                updated_at: waktuSync              // Stempel waktu penanda produk ini "masih hidup"
            }));

            // 3. Simpan/Timpa ke tabel 'digiflazz_products' di Supabase
            const { error: upsertErr } = await supabase.from('digiflazz_products').upsert(products, { onConflict: 'sku_code' });
            if (upsertErr) throw upsertErr;

            // 🔥 4. GARBAGE COLLECTOR: SAPU BERSIH PRODUK MATI (ZOMBIE)
            // Menghapus produk yang waktu update-nya lebih lama (lt / less than) dari waktuSync.
            // Artinya, produk tersebut sudah tidak ada lagi di katalog Digiflazz terbaru.
            const { error: deleteErr } = await supabase
                .from('digiflazz_products')
                .delete()
                .lt('updated_at', waktuSync);

            if (deleteErr) console.log("Gagal menghapus produk lama:", deleteErr);

            return res.status(200).json({ 
                success: true, 
                message: `Berhasil sinkronisasi ${products.length} produk dan membersihkan produk usang/zombie!` 
            });
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
        
        let hargaJual = 0; 
        let isSaldoDipotong = false; 
        
        try {
            // A. Ambil harga jual dari Supabase
            const { data: prod } = await supabase.from('digiflazz_products').select('seller_price').eq('sku_code', sku_code).single();
            if (!prod) return res.status(404).json({ success: false, error: "Produk tidak ditemukan." });

            hargaJual = prod.seller_price;

            // B. Potong saldo pembeli (Panggil fungsi SQL Supabase agar aman dari bug bentrok data)
            const { data: isSuccess, error: deductErr } = await supabase.rpc('kurangi_saldo', {
                p_user_id: user_id,
                p_jumlah: hargaJual
            });

            if (deductErr || !isSuccess) return res.status(400).json({ success: false, error: "Saldo tidak mencukupi." });
            
            isSaldoDipotong = true; // Tandai bahwa saldo berhasil dipotong

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
            if (isSaldoDipotong && user_id && hargaJual > 0) {
                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: hargaJual });
            }
            return res.status(500).json({ success: false, error: "Gangguan server. Transaksi dibatalkan dan saldo dikembalikan." });
        }
    }

    // ==========================================
    // 3. MODE WEBHOOK: MENERIMA LAPORAN DIGIFLAZZ
    // ==========================================
    if (action === 'webhook') {
        try {
            const digiPayload = req.body && req.body.data;
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
