import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const origin = req.headers.origin || req.headers.referer;
    const isWebhook = (req.body && req.body.action === 'webhook') || req.url.includes('webhook') || !!req.headers['x-hub-signature'];
    
    if (!isWebhook && origin) {
        if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {
            return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });
        }
    }
    
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }
    
    let action = (req.body && req.body.action) || req.query.action;
    if (req.headers['x-hub-signature']) {
        action = 'webhook';
    }
    
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_KEY;

    // ==========================================
    // ACTION: SYNC
    // ==========================================
    if (action === 'sync') {
        const sign = crypto.createHash('md5').update(username + apiKey + "depo").digest('hex');
        try {
            const resPrepaid = await fetch('https://api.digiflazz.com/v1/price-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cmd: "prepaid", username, sign }),
                cache: 'no-store'
            });
            const jsonPrepaid = await resPrepaid.json();
            if (jsonPrepaid.data && !Array.isArray(jsonPrepaid.data) && jsonPrepaid.data.message) {
                throw new Error("DIGIFLAZZ MENOLAK (Prepaid): " + jsonPrepaid.data.message);
            }
            const resPasca = await fetch('https://api.digiflazz.com/v1/price-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cmd: "pasca", username, sign }),
                cache: 'no-store'
            });
            const jsonPasca = await resPasca.json();
            if (jsonPasca.data && !Array.isArray(jsonPasca.data) && jsonPasca.data.message) {
                throw new Error("DIGIFLAZZ MENOLAK (Pasca): " + jsonPasca.data.message);
            }
            
            let allRawProducts = [];
            if (jsonPrepaid.data && Array.isArray(jsonPrepaid.data)) allRawProducts = [...allRawProducts, ...jsonPrepaid.data];
            if (jsonPasca.data && Array.isArray(jsonPasca.data)) allRawProducts = [...allRawProducts, ...jsonPasca.data];
            if (allRawProducts.length === 0) throw new Error("Gagal mengambil data dari Digiflazz");
            
            const waktuSync = new Date().toISOString();
            const products = allRawProducts.map(item => {
                const hargaModal = (item.price && item.price > 0) ? item.price : (item.admin || 0);
                const isActive = item.buyer_product_status === true && item.seller_product_status === true;
                return {
                    sku_code: item.buyer_sku_code,
                    product_name: item.product_name,
                    category: item.category,
                    brand: item.brand,
                    type: item.type,
                    price: hargaModal,                 
                    seller_price: hargaModal + 100,    
                    is_active: isActive,                 
                    updated_at: waktuSync                
                };
            });
            
            const chunkSize = 500;
            let totalBerhasil = 0;
            for (let i = 0; i < products.length; i += chunkSize) {
                const chunk = products.slice(i, i + chunkSize);
                const { error: upsertErr } = await supabase.from('digiflazz_products').upsert(chunk, { onConflict: 'sku_code' });
                if (upsertErr) {
                    console.error("Gagal insert batch:", upsertErr.message);
                } else {
                    totalBerhasil += chunk.length;
                }
            }
            await supabase.from('digiflazz_products').delete().lt('updated_at', waktuSync);
            return res.status(200).json({ success: true, message: `Berhasil narik ${totalBerhasil} produk!` });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // ==========================================
    // ACTION: BUY PPOB
    // ==========================================
    if (action === 'buy') {
        const { user_id, sku_code, customer_no } = req.body;
        if (!customer_no || customer_no.length > 50) {
            return res.status(400).json({ success: false, error: "Nomor tujuan tidak valid" });
        }
        const ref_id = "AU2_" + Date.now();
        let hargaJual = 0;
        try {
            const { data: prod } = await supabase.from('digiflazz_products')
                .select('seller_price, is_active')
                .eq('sku_code', sku_code)
                .single();
            if (!prod) return res.status(404).json({ success: false, error: "Produk tidak ditemukan di sistem." });
            if (prod.is_active === false) return res.status(400).json({ success: false, error: "Layanan ini sedang gangguan." });
            
            hargaJual = Number(prod.seller_price);
            
            const { data: isSuccess, error: rpcError } = await supabase.rpc('kurangi_saldo', {
                p_user_id: user_id,
                p_jumlah: hargaJual
            });
            if (rpcError) return res.status(400).json({ success: false, error: `DB Error: ${rpcError.message}` });
            if (!isSuccess) return res.status(400).json({ success: false, error: `Saldo DB tidak cukup! Sistem menagih: Rp ${hargaJual}` });
            
            await supabase.from('wallet_transactions').insert({
                user_id: user_id,
                amount: hargaJual,
                type: 'EXPENSE',
                description: `Pembelian PPOB: ${sku_code} (${customer_no})`
            });
            
            // JIKA INSERT GAGAL (Data tidak masuk ke DB) KITA MANUAL REFUND (Karena Trigger tidak jalan)
            const { error: insertError } = await supabase.from('riwayat_ppob').insert({
                ref_id: ref_id, 
                user_id: user_id, 
                sku_code: sku_code, 
                customer_no: customer_no, 
                price: hargaJual, 
                status: 'Pending',
                sn: null
            });
            
            if (insertError) {
                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: hargaJual });
                await supabase.from('wallet_transactions').insert({
                    user_id: user_id, amount: hargaJual, type: 'INCOME', description: `Refund PPOB Gagal (Sistem): ${sku_code}`
                });
                return res.status(500).json({ success: false, error: "Sistem sibuk, pesanan dibatalkan, saldo direfund." });
            }
            
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
            
            // JIKA API LANGSUNG MENOLAK (Data SUDAH MASUK DB)
            if (digiData.data && digiData.data.status === "Gagal") {
                // Cukup ubah status jadi Gagal, ROBOT SQL TRIGGER akan otomatis memproses Refund & Notifikasi!
                await supabase.from('riwayat_ppob').update({ status: 'Gagal', sn: digiData.data.message }).eq('ref_id', ref_id);
                return res.status(400).json({ success: false, error: "Transaksi gagal. Saldo dikembalikan.", detail: digiData.data.message });
            }
            
            await supabase.from('riwayat_ppob').update({
                status: digiData.data ? digiData.data.status : 'Pending',
                sn: (digiData.data && digiData.data.sn) ? digiData.data.sn : null
            }).eq('ref_id', ref_id);
            
            await supabase.from('messages').insert({
                sender_id: user_id, receiver_id: user_id,
                message: `[SISTEM] Pesanan PPOB *${sku_code}* tujuan *${customer_no}* senilai Rp ${hargaJual.toLocaleString('id-ID')} telah diterima dan sedang diproses sistem.\n\nRef ID: ${ref_id}`
            });
            
            return res.status(200).json({ success: true, data: digiData.data });
        } catch (err) {
            console.error("PPOB Server Error:", err);
            return res.status(200).json({ 
                success: true, 
                message: "Pesanan dalam antrean, namun tidak mendapat respon dari gateway. Sedang ditangani secara otomatis." 
            });
        }
    }

    // ==========================================
    // ACTION: WITHDRAW
    // ==========================================
    if (action === 'withdraw') {
        const { user_id, sku_code, customer_no, product_name } = req.body;
        if (!customer_no || customer_no.length > 50) return res.status(400).json({ success: false, error: "Nomor tujuan tidak valid" });
        const ref_id = "WD_" + Date.now();
        let total_potong_asli = 0;
        try {
            const { data: prodWD } = await supabase.from('digiflazz_products')
                .select('price, is_active')
                .eq('sku_code', sku_code)
                .single();
            if (!prodWD) return res.status(404).json({ success: false, error: "Produk WD tidak ditemukan di sistem." });
            if (prodWD.is_active === false) return res.status(400).json({ success: false, error: "Layanan penarikan sedang gangguan." });
            
            total_potong_asli = Number(prodWD.price) + 500;
            const provider = product_name.split(' ')[0];
            
            const { error: dbError } = await supabase.rpc('tarik_saldo_otomatis', {
                p_user_id: user_id,
                p_total_potong: total_potong_asli, 
                p_provider: provider,
                p_nomor: customer_no,
                p_product_name: product_name
            });
            if (dbError) return res.status(400).json({ success: false, error: dbError.message || "Saldo tidak cukup atau gagal dipotong." });
            
            const { error: insertError } = await supabase.from('riwayat_ppob').insert({
                ref_id: ref_id, 
                user_id: user_id, 
                sku_code: sku_code, 
                customer_no: customer_no, 
                price: total_potong_asli, 
                status: 'Pending',
                sn: null
            });
            
            // Refund manual HANYA jika gagal insert ke DB (Trigger tidak jalan)
            if (insertError) {
                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: total_potong_asli });
                await supabase.from('wallet_transactions').insert({
                    user_id: user_id, amount: total_potong_asli, type: 'INCOME', description: `Refund WD Gagal (Sistem): ${product_name}`
                });
                return res.status(500).json({ success: false, error: "Sistem sibuk, WD dibatalkan, saldo direfund." });
            }
            
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
                // Cukup ubah status, ROBOT SQL TRIGGER yang urus Refund!
                await supabase.from('riwayat_ppob').update({ status: 'Gagal', sn: digiData.data.message }).eq('ref_id', ref_id);
                return res.status(400).json({ success: false, error: "Penarikan gagal. Saldo dikembalikan.", detail: digiData.data.message });
            }
            
            await supabase.from('riwayat_ppob').update({
                status: digiData.data ? digiData.data.status : 'Pending',
                sn: (digiData.data && digiData.data.sn) ? digiData.data.sn : null
            }).eq('ref_id', ref_id);
            
            await supabase.from('messages').insert({
                sender_id: user_id, receiver_id: user_id,
                message: `[SISTEM] Penarikan Saldo Otomatis *${product_name}* tujuan *${customer_no}* senilai Rp ${total_potong_asli.toLocaleString('id-ID')} sedang diproses sistem.\n\nRef ID: ${ref_id}`
            });
            return res.status(200).json({ success: true, data: digiData.data });
        } catch (err) {
            console.error("WD Server Error:", err);
            return res.status(200).json({ 
                success: true, 
                message: "Permintaan masuk antrean. Menunggu respon dari bank/provider." 
            });
        }
    }

    // ==========================================
    // ACTION: WEBHOOK DARI DIGIFLAZZ PUSAT
    // ==========================================
    if (action === 'webhook') {
        try {
            const digiflazzSecret = process.env.DIGIFLAZZ_WEBHOOK_SECRET;
            const urlMentah = req.url || '';
            const ekstrakQuery = new URLSearchParams(urlMentah.split('?')[1] || '');
            const urlSecret = req.query.secret || ekstrakQuery.get('secret');
            
            // Validasi Pintar: Terima Secret URL atau Signature Digiflazz
            let isValidAuth = false;
            if (urlSecret === digiflazzSecret) {
                isValidAuth = true;
            } else if (req.headers['x-hub-signature']) {
                const sigRaw = req.headers['x-hub-signature'];
                const computedSig = 'sha1=' + crypto.createHmac('sha1', digiflazzSecret).update(JSON.stringify(req.body)).digest('hex');
                if (sigRaw === computedSig) isValidAuth = true;
            }

            if (!isValidAuth) {
                console.error("🚨 Webhook PPOB Ditolak: Kunci Secret/Signature tidak valid!");
                return res.status(403).send("Forbidden: Invalid Secret or Signature");
            }
            
            const digiPayload = req.body && req.body.data;
            if (!digiPayload) return res.status(400).json({ error: "Payload tidak valid" });
            
            const refId = digiPayload.ref_id;
            const statusDigi = digiPayload.status;
            
            // UPDATE STATUS KE DATABASE (Memicu Trigger jika statusnya 'Gagal')
            const { data: orderData, error: updateErr } = await supabase
                .from('riwayat_ppob')
                .update({ 
                    status: statusDigi,
                    sn: digiPayload.sn || null
                })
                .eq('ref_id', refId)
                .neq('status', statusDigi)
                .select()
                .maybeSingle();
                
            if (updateErr || !orderData) {
                console.log(`⚠️ Webhook Diabaikan: Order ${refId} sudah diupdate atau tidak ditemukan.`);
                return res.status(200).send("Already processed or invalid");
            }
            
            const isWD = refId.startsWith('WD_');
            const tipeTransaksi = isWD ? 'Penarikan Saldo Otomatis' : 'Pesanan PPOB';
            
            if (statusDigi === "Gagal") {
                // KITA TIDAK MELAKUKAN REFUND DI SINI LAGI! 
                // Robot Database Trigger (auto_refund_ppob_gagal) sudah mengurus Refund & Notifikasi secara otomatis.
                console.log(`✅ [TRIGGER ACTIVE] Refund Otomatis PPOB berjalan di belakang layar untuk: ${refId}`);
            } 
            else if (statusDigi === "Sukses") {
                // Kalau Sukses, Trigger tidak bekerja, jadi kita kirim pesan suksesnya dari sini
                await supabase.from('messages').insert({
                    sender_id: orderData.user_id, receiver_id: orderData.user_id,
                    message: `[SISTEM] Hore! ${tipeTransaksi} *${orderData.sku_code}* tujuan *${orderData.customer_no}* SUKSES!\n\nSN: ${digiPayload.sn || 'Tanpa SN'}`
                });
            }
            
            return res.status(200).send("Webhook Received & Verified");
        } catch (err) {
            console.error("Webhook Error:", err);
            return res.status(500).send("Webhook Error");
        }
    }
    
    return res.status(400).json({ error: 'Action tidak dikenali' });
}
