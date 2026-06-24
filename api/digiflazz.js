import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    const action = (req.body && req.body.action) || req.query.action;
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_KEY;

    // ==========================================
    // 1. MODE SYNC: TARIK PRODUK PREPAID & PASCA
    // ==========================================
    if (action === 'sync') {
        const sign = crypto.createHash('md5').update(username + apiKey + "depo").digest('hex');

        try {
            // 1A. Tarik Data PREPAID
            const resPrepaid = await fetch('http://203.194.114.209:3000/proxy-digiflazz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_url: 'https://api.digiflazz.com/v1/price-list',
                    payload: { cmd: "prepaid", username, sign }
                })
            });
            const jsonPrepaid = await resPrepaid.json();

            // 🔥 TANGKAP ERROR ASLI DARI DIGIFLAZZ (PREPAID)
            if (jsonPrepaid.data && !Array.isArray(jsonPrepaid.data) && jsonPrepaid.data.message) {
                throw new Error("DIGIFLAZZ MENOLAK (Prepaid): " + jsonPrepaid.data.message);
            }

            // 1B. Tarik Data PASCA
            const resPasca = await fetch('http://203.194.114.209:3000/proxy-digiflazz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_url: 'https://api.digiflazz.com/v1/price-list',
                    payload: { cmd: "pasca", username, sign }
                })
            });
            const jsonPasca = await resPasca.json();

            // 🔥 TANGKAP ERROR ASLI DARI DIGIFLAZZ (PASCA)
            if (jsonPasca.data && !Array.isArray(jsonPasca.data) && jsonPasca.data.message) {
                throw new Error("DIGIFLAZZ MENOLAK (Pasca): " + jsonPasca.data.message);
            }

            // 1C. Gabungkan Data (Aman dari not iterable)
            let allRawProducts = [];
            if (jsonPrepaid.data && Array.isArray(jsonPrepaid.data)) {
                allRawProducts = [...allRawProducts, ...jsonPrepaid.data];
            }
            if (jsonPasca.data && Array.isArray(jsonPasca.data)) {
                allRawProducts = [...allRawProducts, ...jsonPasca.data];
            }

            if (allRawProducts.length === 0) throw new Error("Gagal mengambil data dari Digiflazz via VPS (Data Kosong)");

            const produkTerbaik = allRawProducts.filter(item => 
                item.buyer_product_status === true && 
                item.seller_product_status === true
            );

            const waktuSync = new Date().toISOString();

            const products = produkTerbaik.map(item => {
                const hargaModal = (item.price && item.price > 0) ? item.price : (item.admin || 0);
                return {
                    sku_code: item.buyer_sku_code,
                    product_name: item.product_name,
                    category: item.category,
                    brand: item.brand,
                    price: hargaModal,                 
                    seller_price: hargaModal + 100,    
                    is_active: true,                   
                    updated_at: waktuSync              
                };
            });

            const { error: upsertErr } = await supabase.from('digiflazz_products').upsert(products, { onConflict: 'sku_code' });
            if (upsertErr) throw upsertErr;

            const { error: deleteErr } = await supabase
                .from('digiflazz_products')
                .delete()
                .lt('updated_at', waktuSync);

            return res.status(200).json({ 
                success: true, 
                message: `Berhasil sinkronisasi ${products.length} produk (Prepaid & Pasca) dan membersihkan produk usang/zombie!` 
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
        const ref_id = "AU2_" + Date.now(); 
        
        let hargaJual = 0; 
        let isSaldoDipotong = false; 
        
        try {
            const { data: prod } = await supabase.from('digiflazz_products').select('seller_price').eq('sku_code', sku_code).single();
            if (!prod) return res.status(404).json({ success: false, error: "Produk tidak ditemukan." });

            hargaJual = prod.seller_price;

            const { data: isSuccess, error: deductErr } = await supabase.rpc('kurangi_saldo', {
                p_user_id: user_id,
                p_jumlah: hargaJual
            });

            if (deductErr || !isSuccess) return res.status(400).json({ success: false, error: "Saldo tidak mencukupi." });
            
            isSaldoDipotong = true;

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

            if (digiData.data && digiData.data.status === "Gagal") {
                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: hargaJual }); 
                return res.status(400).json({ success: false, error: "Transaksi gagal dari pusat. Saldo dikembalikan.", detail: digiData.data.message });
            }

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

            const { data: orderData } = await supabase.from('riwayat_ppob').update({ status: statusDigi }).eq('ref_id', refId).select().single();

            if (statusDigi === "Gagal" && orderData) {
                await supabase.rpc('tambah_saldo', { p_user_id: orderData.user_id, p_jumlah: orderData.price });
            }

            return res.status(200).send("Webhook Received");
        } catch (err) {
            return res.status(500).send("Webhook Error");
        }
    }

    return res.status(400).json({ error: 'Action tidak dikenali' });
}
