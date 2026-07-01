import crypto from 'crypto';

import { createClient } from '@supabase/supabase-js';



// Meminta Vercel untuk mengizinkan proses berjalan lebih lama (hingga 60 detik)

export const maxDuration = 60; 



const supabase = createClient(

    process.env.SUPABASE_URL,

    process.env.SUPABASE_SERVICE_ROLE_KEY

);



export default async function handler(req, res) {

    // ==========================================

// 🛡️ PROTEKSI CORS: HANYA IZINKAN DOMAIN SENDIRI

// ==========================================

const origin = req.headers.origin || req.headers.referer;

// Kecualikan webhook dari pengecekan origin karena webhook dikirim oleh server Xoftware/Digiflazz, bukan dari browser

const isWebhook = (req.body && req.body.action === 'webhook') || req.url.includes('webhook');



if (!isWebhook && origin) {

    if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {

        return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });

    }

}

    if (req.method !== 'POST' && req.method !== 'GET') {

        return res.status(405).json({ error: 'Method tidak diizinkan' });

    }



let action = (req.body && req.body.action) || req.query.action;

// 🔥 JURUS ANTI-GAGAL: Deteksi otomatis jika request datang dari Digiflazz
// Digiflazz selalu membawa header 'x-hub-signature' saat mengirim Webhook
if (req.headers['x-hub-signature']) {
    action = 'webhook';
}

const username = process.env.DIGIFLAZZ_USERNAME;
const apiKey = process.env.DIGIFLAZZ_KEY;



    // ==========================================

    // 1. MODE SYNC: TARIK PRODUK PREPAID & PASCA

    // ==========================================

    if (action === 'sync') {

        // [Kode sync Anda sudah bagus, saya biarkan sama seperti aslinya]

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

    // 2. MODE BUY: TRANSAKSI & POTONG SALDO (PPOB UMUM)

    // ==========================================

    if (action === 'buy') {

        const { user_id, sku_code, customer_no } = req.body;

        const ref_id = "AU2_" + Date.now(); 

        

        let hargaJual = 0; 

        let isSaldoDipotong = false; 

        

        try {

            // Pastikan SKU aktif

            const { data: prod } = await supabase.from('digiflazz_products')

                .select('seller_price, is_active')

                .eq('sku_code', sku_code)

                .single();

                

            if (!prod) return res.status(404).json({ success: false, error: "Produk tidak ditemukan di sistem." });

            if (prod.is_active === false) return res.status(400).json({ success: false, error: "Layanan ini sedang gangguan." });



            hargaJual = Number(prod.seller_price);



            // 🛡️ PERBAIKAN KEAMANAN: Eksekusi fungsi kurangi_saldo via RPC (Kebal Spam Klik)

            const { data: isSuccess, error: rpcError } = await supabase.rpc('kurangi_saldo', {

                p_user_id: user_id,

                p_jumlah: hargaJual

            });



            if (rpcError || !isSuccess) {

                return res.status(400).json({ success: false, error: `Saldo tidak mencukupi atau transaksi ditolak.` });

            }

            

            isSaldoDipotong = true;



            await supabase.from('wallet_transactions').insert({

                user_id: user_id,

                amount: hargaJual,

                type: 'EXPENSE',

                description: `Pembelian PPOB: ${sku_code} (${customer_no})`

            });



            // Tembak Digiflazz

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



            // Jika Langsung Gagal dari Digiflazz

            if (digiData.data && digiData.data.status === "Gagal") {

                // 🛡️ KEAMANAN: Kembalikan saldo dengan RPC yang aman (tambah_saldo) jika Anda memilikinya,

                // Jika tidak, RLS Anda (service_role) cukup aman melakukan update ini.

                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: hargaJual });

                

                await supabase.from('wallet_transactions').insert({

                    user_id: user_id, amount: hargaJual, type: 'INCOME', description: `Refund PPOB Gagal: ${sku_code}`

                });



                await supabase.from('messages').insert({

                    sender_id: user_id, receiver_id: user_id,

                    message: `[SISTEM] Transaksi PPOB *${sku_code}* ke nomor *${customer_no}* GAGAL diproses oleh pusat.\n\nAlasan: ${digiData.data.message}\nDana Rp ${hargaJual.toLocaleString('id-ID')} telah direfund ke saldo Anda.`

                });

                

                return res.status(400).json({ success: false, error: "Transaksi gagal. Saldo dikembalikan.", detail: digiData.data.message });

            }



            // SIMPAN SN JIKA DIGIFLAZZ MERESPONS CEPAT

            await supabase.from('riwayat_ppob').insert({

                ref_id: ref_id, 

                user_id: user_id, 

                sku_code: sku_code, 

                customer_no: customer_no, 

                price: hargaJual, 

                status: digiData.data ? digiData.data.status : 'Pending',

                sn: (digiData.data && digiData.data.sn) ? digiData.data.sn : null

            });



            await supabase.from('messages').insert({

                sender_id: user_id, receiver_id: user_id,

                message: `[SISTEM] Pesanan PPOB *${sku_code}* tujuan *${customer_no}* senilai Rp ${hargaJual.toLocaleString('id-ID')} telah diterima dan sedang diproses sistem.\n\nRef ID: ${ref_id}`

            });



            return res.status(200).json({ success: true, data: digiData.data });



        } catch (err) {

            // Jika API error tapi saldo telanjur dipotong, kembalikan uang user

            if (isSaldoDipotong && user_id && hargaJual > 0) {

                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: hargaJual });

            }

            return res.status(500).json({ success: false, error: "Gangguan server. Transaksi dibatalkan dan saldo dikembalikan.", detail: err.message });

        }

    }



    // ==========================================

    // 3. MODE WITHDRAW: PENARIKAN SALDO OTOMATIS (E-MONEY)

    // ==========================================

    if (action === 'withdraw') {

        // [Kode withdraw Anda sudah sangat aman karena memanggil RPC 'tarik_saldo_otomatis']

        // Saya biarkan persis seperti aslinya karena sudah menggunakan standar tinggi.

        const { user_id, sku_code, customer_no, product_name } = req.body;

        const ref_id = "WD_" + Date.now(); 

        

        let total_potong_asli = 0;

        let isSaldoDipotong = false; 



        try {

            const { data: prodWD } = await supabase.from('digiflazz_products')

                .select('price, is_active')

                .eq('sku_code', sku_code)

                .single();

                

            if (!prodWD) return res.status(404).json({ success: false, error: "Produk WD tidak ditemukan di sistem." });

            if (prodWD.is_active === false) return res.status(400).json({ success: false, error: "Layanan penarikan sedang gangguan." });



            total_potong_asli = Number(prodWD.price) + 500;

            const provider = product_name.split(' ')[0]; 

            

            // Eksekusi fungsi potong saldo RPC (Sama seperti P2P Transfer, anti nembus RLS)

            const { error: dbError } = await supabase.rpc('tarik_saldo_otomatis', {

                p_user_id: user_id,

                p_total_potong: total_potong_asli, 

                p_provider: provider,

                p_nomor: customer_no,

                p_product_name: product_name

            });



            if (dbError) {

                return res.status(400).json({ success: false, error: dbError.message || "Saldo tidak cukup atau gagal dipotong." });

            }

            

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



            // Jika Gagal Langsung dari Pusat

            if (digiData.data && digiData.data.status === "Gagal") {

                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: total_potong_asli });

                    

                await supabase.from('wallet_transactions').insert({

                    user_id: user_id, amount: total_potong_asli, type: 'INCOME', description: `Refund Penarikan Gagal: ${product_name}`

                });



                await supabase.from('messages').insert({

                    sender_id: user_id, receiver_id: user_id,

                    message: `[SISTEM] Penarikan Saldo Otomatis *${product_name}* ke nomor *${customer_no}* GAGAL diproses oleh pusat.\n\nAlasan: ${digiData.data.message}\nDana Rp ${total_potong_asli.toLocaleString('id-ID')} telah dikembalikan utuh ke saldo Anda.`

                });

                

                return res.status(400).json({ success: false, error: "Penarikan gagal. Saldo dikembalikan.", detail: digiData.data.message });

            }



            await supabase.from('riwayat_ppob').insert({

                ref_id: ref_id, 

                user_id: user_id, 

                sku_code: sku_code, 

                customer_no: customer_no, 

                price: total_potong_asli, 

                status: digiData.data ? digiData.data.status : 'Pending',

                sn: (digiData.data && digiData.data.sn) ? digiData.data.sn : null

            });



            await supabase.from('messages').insert({

                sender_id: user_id, receiver_id: user_id,

                message: `[SISTEM] Penarikan Saldo Otomatis *${product_name}* tujuan *${customer_no}* senilai Rp ${total_potong_asli.toLocaleString('id-ID')} sedang diproses sistem.\n\nRef ID: ${ref_id}`

            });



            return res.status(200).json({ success: true, data: digiData.data });



        } catch (err) {

            if (isSaldoDipotong && user_id && total_potong_asli > 0) {

                await supabase.rpc('tambah_saldo', { p_user_id: user_id, p_jumlah: total_potong_asli });

            }

            return res.status(500).json({ success: false, error: "Gangguan server. Penarikan dibatalkan dan saldo dikembalikan.", detail: err.message });

        }

    }



    // ==========================================

    // 4. MODE WEBHOOK: MENERIMA LAPORAN DIGIFLAZZ

    // ==========================================

    if (action === 'webhook') {

        try {

            // 🛡️ PERBAIKAN KEAMANAN: VALIDASI SIGNATURE DIGIFLAZZ (ANTI SPOOFING)

            const digiflazzSecret = process.env.DIGIFLAZZ_WEBHOOK_SECRET; 

            const signatureHeader = req.headers['x-hub-signature'];



            if (!signatureHeader || !digiflazzSecret) {

                console.error("🚨 Webhook PPOB Ditolak: Signature Header atau Secret tidak ditemukan.");

                return res.status(401).send("Unauthorized: Missing signature");

            }



            // Rumus Digiflazz: HMAC SHA1

            const payloadString = JSON.stringify(req.body);

            const expectedSignature = 'sha1=' + crypto.createHmac('sha1', digiflazzSecret).update(payloadString).digest('hex');



            // Gunakan timingSafeEqual untuk menghindari Timing Attack

            const sigBuffer = Buffer.from(signatureHeader);

            const expectedBuffer = Buffer.from(expectedSignature);



            if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {

                console.error("🚨 Webhook PPOB Ditolak: SIGNATURE TIDAK COCOK! (Potensi Fake Refund)");

                return res.status(403).send("Forbidden: Invalid signature");

            }



            // --- JIKA LOLOS VALIDASI, BARU PROSES DATANYA ---

            const digiPayload = req.body && req.body.data;

            if (!digiPayload) return res.status(400).json({ error: "Payload tidak valid" });



            const refId = digiPayload.ref_id;

            const statusDigi = digiPayload.status;



            const updatePayload = { status: statusDigi };

            if (digiPayload.sn) updatePayload.sn = digiPayload.sn;



            const { data: orderData } = await supabase.from('riwayat_ppob').update(updatePayload).eq('ref_id', refId).select().single();



            if (orderData) {

                const hargaAwal = Number(orderData.price);

                const isWD = refId.startsWith('WD_');

                const tipeTransaksi = isWD ? 'Penarikan Saldo Otomatis' : 'Pesanan PPOB';

                const deskripsiRefund = isWD ? `Refund Penarikan Gagal: ${orderData.sku_code}` : `Refund PPOB Gagal: ${orderData.sku_code}`;



                if (statusDigi === "Gagal") {

                    // Gunakan RPC tambah_saldo untuk mengembalikan uang secara presisi

                    await supabase.rpc('tambah_saldo', { p_user_id: orderData.user_id, p_jumlah: hargaAwal });

                        

                    await supabase.from('wallet_transactions').insert({

                        user_id: orderData.user_id,

                        amount: hargaAwal,

                        type: 'INCOME',

                        description: deskripsiRefund

                    });



                    await supabase.from('messages').insert({

                        sender_id: orderData.user_id, receiver_id: orderData.user_id,

                        message: `[SISTEM] ${tipeTransaksi} *${orderData.sku_code}* tujuan *${orderData.customer_no}* GAGAL diproses oleh provider.\n\nAlasan/Catatan: ${digiPayload.sn || 'Dibatalkan server'}\nDana Rp ${hargaAwal.toLocaleString('id-ID')} telah direfund ke saldo Anda.`

                    });

                } 

                else if (statusDigi === "Sukses") {

                    await supabase.from('messages').insert({

                        sender_id: orderData.user_id, receiver_id: orderData.user_id,

                        message: `[SISTEM] Hore! ${tipeTransaksi} *${orderData.sku_code}* tujuan *${orderData.customer_no}* SUKSES!\n\nSN: ${digiPayload.sn || 'Tanpa SN'}`

                    });

                }

            }



            return res.status(200).send("Webhook Received & Verified");

        } catch (err) {

            console.error("Webhook Error:", err);

            return res.status(500).send("Webhook Error");

        }

    }



    return res.status(400).json({ error: 'Action tidak dikenali' });

} 

