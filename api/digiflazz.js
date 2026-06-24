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

            if (jsonPasca.data && !Array.isArray(jsonPasca.data) && jsonPasca.data.message) {
                throw new Error("DIGIFLAZZ MENOLAK (Pasca): " + jsonPasca.data.message);
            }

            // 1C. Gabungkan Data
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
                message: `Berhasil sinkronisasi ${products.length} produk (Prepaid & Pasca) dan membersihkan produk usang!` 
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
            // 1. Cari Produk
            const { data: prod } = await supabase.from('digiflazz_products').select('seller_price').eq('sku_code', sku_code).single();
            if (!prod) return res.status(404).json({ success: false, error: "Produk tidak ditemukan." });

            hargaJual = Number(prod.seller_price);

            // 🔥 PERBAIKAN: Potong Saldo Manual Tanpa RPC (Jauh Lebih Aman & Anti-Error)
            const { data: profile, error: profErr } = await supabase.from('profiles').select('balance').eq('id', user_id).single();
            if (profErr || !profile) return res.status(400).json({ success: false, error: "Gagal memuat profil pengguna." });

            const saldoSaatIni = Number(profile.balance) || 0;
            
            // Cek Saldo Real-time
            if (saldoSaatIni < hargaJual) {
                return res.status(400).json({ success: false, error: `Saldo tidak mencukupi. (Saldo: ${saldoSaatIni}, Harga: ${hargaJual})` });
            }

            // Eksekusi Potong Saldo
            const { error: deductErr } = await supabase.from('profiles').update({ balance: saldoSaatIni - hargaJual }).eq('id', user_id);
            if (deductErr) return res.status(400).json({ success: false, error: "Gagal memotong saldo sistem." });
            
            isSaldoDipotong = true;

            // 2. Tembak Transaksi ke Digiflazz
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

            // 3. Tangani Jika Digiflazz Gagal (Refund Saldo Manual Tanpa RPC)
            if (digiData.data && digiData.data.status === "Gagal") {
                const { data: profSekarang } = await supabase.from('profiles').select('balance').eq('id', user_id).single();
                if (profSekarang) {
                    await supabase.from('profiles').update({ balance: Number(profSekarang.balance) + hargaJual }).eq('id', user_id);
                }
                return res.status(400).json({ success: false, error: "Transaksi gagal dari pusat. Saldo dikembalikan.", detail: digiData.data.message });
            }

            // 4. Catat Riwayat Pembelian
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
            // 🔥 PERBAIKAN: Refund Saldo Jika Server Vercel Tiba-tiba Error
            if (isSaldoDipotong && user_id && hargaJual > 0) {
                const { data: profSekarang } = await supabase.from('profiles').select('balance').eq('id', user_id).single();
                if (profSekarang) {
                    await supabase.from('profiles').update({ balance: Number(profSekarang.balance) + hargaJual }).eq('id', user_id);
                }
            }
            return res.status(500).json({ success: false, error: "Gangguan server. Transaksi dibatalkan dan saldo dikembalikan.", detail: err.message });
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

            // 🔥 PERBAIKAN: Refund Saldo Manual via Webhook jika Transaksi dinyatakan Gagal
            if (statusDigi === "Gagal" && orderData) {
                const { data: profRefund } = await supabase.from('profiles').select('balance').eq('id', orderData.user_id).single();
                if (profRefund) {
                    await supabase.from('profiles').update({ balance: Number(profRefund.balance) + Number(orderData.price) }).eq('id', orderData.user_id);
                }
            }

            return res.status(200).send("Webhook Received");
        } catch (err) {
            return res.status(500).send("Webhook Error");
        }
    }

    return res.status(400).json({ error: 'Action tidak dikenali' });
}
