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

            let allRawProducts = [];
            if (jsonPrepaid.data && Array.isArray(jsonPrepaid.data)) allRawProducts = [...allRawProducts, ...jsonPrepaid.data];
            if (jsonPasca.data && Array.isArray(jsonPasca.data)) allRawProducts = [...allRawProducts, ...jsonPasca.data];

            if (allRawProducts.length === 0) throw new Error("Gagal mengambil data dari Digiflazz via VPS");

            const produkTerbaik = allRawProducts.filter(item => item.buyer_product_status === true && item.seller_product_status === true);
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

            // 🔥 PERBAIKAN: Potong data jadi per 500 item agar Supabase tidak tersedak (Timeout)
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

            // Bersihkan produk usang/zombie
            await supabase.from('digiflazz_products').delete().lt('updated_at', waktuSync);

            return res.status(200).json({ success: true, message: `Berhasil sinkronisasi ${totalBerhasil} produk!` });
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

            // 2. Potong Saldo Manual
            const { data: profile, error: profErr } = await supabase.from('profiles').select('balance').eq('id', user_id).single();
            if (profErr || !profile) return res.status(400).json({ success: false, error: "Gagal memuat profil pengguna." });

            const saldoSaatIni = Number(profile.balance) || 0;
            if (saldoSaatIni < hargaJual) {
                return res.status(400).json({ success: false, error: `Saldo tidak mencukupi.` });
            }

            // Eksekusi Potong Saldo
            const { error: deductErr } = await supabase.from('profiles').update({ balance: saldoSaatIni - hargaJual }).eq('id', user_id);
            if (deductErr) return res.status(400).json({ success: false, error: "Gagal memotong saldo sistem." });
            
            isSaldoDipotong = true;

            // 🔥 CATAT MUTASI PENGELUARAN KE DOMPET
            await supabase.from('wallet_transactions').insert({
                user_id: user_id,
                amount: hargaJual,
                type: 'EXPENSE',
                description: `Pembelian PPOB: ${sku_code} (${customer_no})`
            });

            // 3. Tembak Transaksi ke Digiflazz
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

            // 4. JIKA GAGAL INSTAN DARI DIGIFLAZZ (REFUND)
            if (digiData.data && digiData.data.status === "Gagal") {
                const { data: profSekarang } = await supabase.from('profiles').select('balance').eq('id', user_id).single();
                if (profSekarang) {
                    await supabase.from('profiles').update({ balance: Number(profSekarang.balance) + hargaJual }).eq('id', user_id);
                    
                    // 🔥 CATAT MUTASI REFUND KE DOMPET
                    await supabase.from('wallet_transactions').insert({
                        user_id: user_id,
                        amount: hargaJual,
                        type: 'INCOME',
                        description: `Refund PPOB Gagal: ${sku_code}`
                    });

                    // 🔥 KIRIM NOTIFIKASI GAGAL KE INBOX CHAT
                    await supabase.from('messages').insert({
                        sender_id: user_id, receiver_id: user_id,
                        message: `[SISTEM] Transaksi PPOB *${sku_code}* ke nomor *${customer_no}* GAGAL diproses oleh pusat.\n\nAlasan: ${digiData.data.message}\nDana Rp ${hargaJual.toLocaleString('id-ID')} telah direfund ke saldo Anda.`
                    });
                }
                return res.status(400).json({ success: false, error: "Transaksi gagal. Saldo dikembalikan.", detail: digiData.data.message });
            }

            // 5. JIKA SUKSES / PENDING
            await supabase.from('riwayat_ppob').insert({
                ref_id: ref_id, user_id: user_id, sku_code: sku_code, customer_no: customer_no, price: hargaJual, status: digiData.data ? digiData.data.status : 'Pending'
            });

            // 🔥 KIRIM NOTIFIKASI PROSES KE INBOX CHAT
            await supabase.from('messages').insert({
                sender_id: user_id, receiver_id: user_id,
                message: `[SISTEM] Pesanan PPOB *${sku_code}* tujuan *${customer_no}* senilai Rp ${hargaJual.toLocaleString('id-ID')} telah diterima dan sedang diproses sistem.\n\nRef ID: ${ref_id}`
            });

            return res.status(200).json({ success: true, data: digiData.data });

        } catch (err) {
            // Jaring Pengaman: Jika server Vercel error tiba-tiba
            if (isSaldoDipotong && user_id && hargaJual > 0) {
                const { data: profSekarang } = await supabase.from('profiles').select('balance').eq('id', user_id).single();
                if (profSekarang) await supabase.from('profiles').update({ balance: Number(profSekarang.balance) + hargaJual }).eq('id', user_id);
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

            if (orderData) {
                const hargaAwal = Number(orderData.price);

                if (statusDigi === "Gagal") {
                    // 🔥 REFUND SALDO
                    const { data: profRefund } = await supabase.from('profiles').select('balance').eq('id', orderData.user_id).single();
                    if (profRefund) {
                        await supabase.from('profiles').update({ balance: Number(profRefund.balance) + hargaAwal }).eq('id', orderData.user_id);
                        
                        // 🔥 CATAT MUTASI REFUND WEBHOOK KE DOMPET
                        await supabase.from('wallet_transactions').insert({
                            user_id: orderData.user_id,
                            amount: hargaAwal,
                            type: 'INCOME',
                            description: `Refund PPOB Gagal: ${orderData.sku_code}`
                        });

                        // 🔥 KIRIM NOTIFIKASI GAGAL KE INBOX CHAT
                        await supabase.from('messages').insert({
                            sender_id: orderData.user_id, receiver_id: orderData.user_id,
                            message: `[SISTEM] Pesanan PPOB *${orderData.sku_code}* tujuan *${orderData.customer_no}* GAGAL diproses oleh provider.\n\nDana Rp ${hargaAwal.toLocaleString('id-ID')} telah direfund ke saldo Anda.`
                        });
                    }
                } 
                else if (statusDigi === "Sukses") {
                    // 🔥 KIRIM NOTIFIKASI SUKSES KE INBOX CHAT
                    await supabase.from('messages').insert({
                        sender_id: orderData.user_id, receiver_id: orderData.user_id,
                        message: `[SISTEM] Hore! Pesanan PPOB *${orderData.sku_code}* tujuan *${orderData.customer_no}* SUKSES!\n\nSN: ${digiPayload.sn || 'Tanpa SN'}`
                    });
                }
            }

            return res.status(200).send("Webhook Received");
        } catch (err) {
            return res.status(500).send("Webhook Error");
        }
    }

    return res.status(400).json({ error: 'Action tidak dikenali' });
}
