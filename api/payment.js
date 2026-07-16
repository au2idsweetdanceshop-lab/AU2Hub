import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

function hitungPotonganSeller(harga) {
    if (harga <= 25000) return 1000;
    if (harga <= 50000) return 2000;
    if (harga <= 99999) return 3000;
    if (harga <= 499999) return 10000;
    if (harga <= 1000000) return 20000;
    if (harga <= 1499999) return 20000;
    if (harga <= 1999999) return 25000;
    return 35000;
}

export default async function handler(req, res) {
    const action = req.query.action || req.body?.action;
    if (action === 'create_qris') {
        const origin = req.headers.origin || req.headers.referer;
        const isWebhook = (req.body && req.body.action === 'webhook') || req.url.includes('webhook');
        if (!isWebhook && origin) {
            if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {
                return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });
            }
        }
        if (req.method !== 'POST') {
            return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        }
        const { order_id, product_name, customer_name, amount } = req.body;
        const baseUrl = process.env.XOFTWARE_BASE_URL;
        const apiKey = process.env.XOFTWARE_API_KEY;
        try {
            let orderData = null;
            let isPasarPlayer = false;
            const { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', order_id).single();
            if (orderPlayer) {
                orderData = orderPlayer;
                isPasarPlayer = true;
            } else {
                const { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', order_id).single();
                if (orderAdmin) orderData = orderAdmin;
            }
            if (!orderData) {
                return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan di sistem database.' });
            }
            let finalVerifiedPrice = parseInt(orderData.price);
            if (isPasarPlayer && orderData.product_id) {
                const { data: productMaster, error: errMaster } = await supabase
                    .from('player_products')
                    .select('*')
                    .eq('id', orderData.product_id)
                    .single();
                if (errMaster || !productMaster) {
                    console.error("DB Error (Master Product):", errMaster);
                    return res.status(400).json({ success: false, message: 'Produk referensi asli tidak ditemukan.' });
                }
                let validUnitPrices = [];
                let baseHarga = parseInt(productMaster.price);
                if (productMaster.fee_ditanggung_pembeli === true || String(productMaster.fee_ditanggung_pembeli) === "true") {
                    baseHarga += hitungPotonganSeller(baseHarga);
                }
                let hargaCustomerUtama = Math.floor(baseHarga + (baseHarga * 0.007) + 500);
                validUnitPrices.push(hargaCustomerUtama);
                let rawVariasi = productMaster.variations || productMaster.variasi || [];
                if (Array.isArray(rawVariasi)) {
                    rawVariasi.forEach(v => {
                        if (typeof v === 'object' && v !== null) {
                            let hargaVarAsli = parseFloat(v.harga || v.price || 0);
                            if (productMaster.fee_ditanggung_pembeli === true || String(productMaster.fee_ditanggung_pembeli) === "true") {
                                hargaVarAsli += hitungPotonganSeller(hargaVarAsli);
                            }
                            let hargaVarMarkup = Math.floor(hargaVarAsli + (hargaVarAsli * 0.007) + 500);
                            validUnitPrices.push(hargaVarMarkup);
                        }
                    });
                }
                let qty = 1;
                const namaProduk = orderData.product_name || "";
                const qtyMatch = namaProduk.match(/\(x(\d+)\)/);
                if (qtyMatch) {
                    qty = parseInt(qtyMatch[1]);
                }
                let hargaTanpaRekber = finalVerifiedPrice;
                if (namaProduk && namaProduk.includes('[+Rekber]')) {
                    if (hargaTanpaRekber >= 2035000) hargaTanpaRekber -= 35000;
                    else if (hargaTanpaRekber >= 1525000) hargaTanpaRekber -= 25000;
                    else if (hargaTanpaRekber >= 520000) hargaTanpaRekber -= 20000;
                    else if (hargaTanpaRekber >= 110000) hargaTanpaRekber -= 10000;
                    else hargaTanpaRekber -= 5000;
                }
                const calculatedUnitPrice = Math.round(hargaTanpaRekber / qty);
                if (!validUnitPrices.includes(calculatedUnitPrice)) {
                    console.error(`[HACK ATTEMPT PASAR PLAYER!] Harga Tanpa Rekber: ${hargaTanpaRekber} | QTY: ${qty} | Harga Asli DB: ${validUnitPrices.join(', ')}`);
                    return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi harga! Permintaan QRIS ditolak demi keamanan.' });
                }
                finalVerifiedPrice = parseInt(orderData.price);
            } else if (orderData.product_name && orderData.product_name.startsWith('[DEPOSIT]')) {
                const depositMatch = orderData.product_name.match(/\[DEPOSIT\]\s*(\d+)/);
                if (!depositMatch) {
                     return res.status(400).json({ success: false, message: 'Format top up tidak valid.' });
                }
                const nominalMurniDeposit = parseInt(depositMatch[1]);
                const feeSistemDeposit = 500 + Math.floor(nominalMurniDeposit * 0.007);
                const hargaYangSeharusnya = nominalMurniDeposit + feeSistemDeposit;
                if (finalVerifiedPrice !== hargaYangSeharusnya) {
                    console.error(`[HACK ATTEMPT DEPOSIT!] User mencoba top up Rp ${nominalMurniDeposit} tapi mengirim harga Rp ${finalVerifiedPrice}. (Seharusnya Rp ${hargaYangSeharusnya})`);
                    return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi nominal pembayaran!' });
                }
                finalVerifiedPrice = hargaYangSeharusnya;
            } else if (orderData.product_name && orderData.product_name.includes('[VIP]')) {
                 let hargaVipMurni = 0;
                 if (orderData.product_name.includes('1 Tahun')) hargaVipMurni = 333 * 365;
                 else if (orderData.product_name.match(/(\d+)\s+Bulan/i)) {
                     hargaVipMurni = 333 * 30 * parseInt(orderData.product_name.match(/(\d+)\s+Bulan/i)[1]);
                 }
                 else if (orderData.product_name.match(/(\d+)\s+Hari/i)) {
                     hargaVipMurni = 333 * parseInt(orderData.product_name.match(/(\d+)\s+Hari/i)[1]);
                 }
                 if (hargaVipMurni > 0) {
                     const feeSistemVip = 500 + Math.floor(hargaVipMurni * 0.007);
                     const hargaVipSeharusnya = hargaVipMurni + feeSistemVip;
                     if (finalVerifiedPrice !== hargaVipSeharusnya) {
                         console.error(`[HACK ATTEMPT VIP!] Terdeteksi manipulasi harga VIP.`);
                         return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi nominal langganan!' });
                     }
                     finalVerifiedPrice = hargaVipSeharusnya;
                 }
            } else {
                console.error(`[HACK ATTEMPT UNKNOWN!] Terdeteksi pembelian produk tidak dikenal: ${orderData.product_name}`);
                return res.status(400).json({ success: false, message: 'Produk tidak valid atau tidak dikenali sistem.' });
            }
            const safeCustomerId = orderData.user_id ? String(orderData.user_id).slice(0, 8) : "UNKNOWN";
            const safeProductId = orderData.product_id ? String(orderData.product_id).slice(0, 20) : "SKU-001";
            const finalCustomerName = (customer_name && customer_name.trim() !== "") ? customer_name : "Player AU2Hub";
            const payload = {
                merchant_id: 129, 
                channel_code: "QRISREALTIME",
                amount: finalVerifiedPrice,
                ref_id: orderData.id,
                fee_direction: "merchant",
                notify_url: "https://www.au2idsweetdance.com/api/webhook",
                note: `Pembayaran: ${product_name || 'AU2Hub Order'}`,
                metadata: {
                    customer: {
                        id: `CUST-${safeCustomerId}`, 
                        name: finalCustomerName,
                        phone: "081234567890",
                        email: "buyer@au2hub.com"
                    },
                    products: [
                        {
                            product_code: safeProductId,
                            product_name: product_name || "Produk AU2Hub",
                            product_thumbnail: "https://au2idsweetdance.com/favicon.ico", 
                            product_url: "https://au2idsweetdance.com"
                        }
                    ]
                }
            };
            const payloadString = JSON.stringify(payload);
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const method = 'POST';
            const path = '/v1/api/transactions';
            const messageToSign = `${timestamp}\n${method}\n${path}\n${payloadString}`;
            const signature = crypto
                .createHmac('sha256', apiKey)
                .update(messageToSign, 'utf8')
                .digest('base64');
            const response = await fetch(`${baseUrl}${path}`, { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,             
                    'X-Timestamp': timestamp,        
                    'X-Signature': signature         
                },
                body: payloadString
            });
            const textResponse = await response.text();
            let dataXoftware;
            try {
                dataXoftware = JSON.parse(textResponse);
            } catch (e) {
                console.error("Xoftware merespons format aneh (Bukan JSON):", textResponse);
                return res.status(502).json({ success: false, message: 'Gateway Xoftware sedang down atau merespons error aneh.' });
            }
            const qrisString = dataXoftware.qris_text || (dataXoftware.data && dataXoftware.data.qris_text);
            if (qrisString) {
                return res.status(200).json({ success: true, qris_string: qrisString });
            } else {
                console.error("Xoftware API Error Detailed:", dataXoftware);
                return res.status(400).json({ success: false, message: dataXoftware.message || dataXoftware.error || 'Provider Gateway menolak memproses pesanan ini.' });
            }
        } catch (error) {
            console.error("QRIS Server Error:", error);
            return res.status(500).json({ success: false, message: "Terjadi kesalahan internal pada server backend." });
        }
    }
    else if (action === 'check_status') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method Not Allowed' });
        const { order_id, table } = req.query;
        if (!order_id) return res.status(400).json({ success: false, message: 'Missing order_id' });
        const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';
        try {
            const { data: existingOrder, error } = await supabase.from(targetTable).select('*').eq('id', order_id).single();
            if (error || !existingOrder) return res.status(404).json({ success: false, status: 'ERROR', message: 'Pesanan tidak ditemukan' });
            
            const currentDbStatus = String(existingOrder.status).toUpperCase();
            if (currentDbStatus === 'SUCCESS' || currentDbStatus === 'SELESAI' || currentDbStatus === 'PROSES' || currentDbStatus === 'PAID') {
                return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Sudah lunas' });
            }
            const baseUrl = process.env.XOFTWARE_BASE_URL;
            const apiKey = process.env.XOFTWARE_API_KEY;
            const payload = { ref_id: order_id };
            const payloadString = JSON.stringify(payload);
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const method = 'POST';
            const path = '/v1/api/transactions/status';
            const messageToSign = `${timestamp}\n${method}\n${path}\n${payloadString}`;
            const signature = crypto.createHmac('sha256', apiKey).update(messageToSign, 'utf8').digest('base64');
            const response = await fetch(`${baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    'X-Timestamp': timestamp,
                    'X-Signature': signature
                },
                body: payloadString
            });
            const textResponse = await response.text();
            let dataXoftware;
            try {
                dataXoftware = JSON.parse(textResponse);
            } catch (e) {
                return res.status(200).json({ success: true, status: 'PENDING', message: 'Provider Gateway error format' });
            }
            const statusXoftware = String(dataXoftware.status || dataXoftware.data?.status || '').toUpperCase();
            const paymentStatus = String(dataXoftware.payment_status || dataXoftware.data?.payment_status || '').toUpperCase();
            const statusTrans = String(dataXoftware.transaction_status || dataXoftware.data?.transaction_status || '').toUpperCase();
            if (
                statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || 
                paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS' ||
                statusTrans === 'SUCCESS' || statusTrans === 'SETTLED'
            ) {
                const productName = existingOrder.product_name || '';
                const userId = existingOrder.user_id;
                const pricePaid = Number(existingOrder.price);
                if (productName.startsWith('[DEPOSIT]')) {
                    let amountToAdd = pricePaid; 
                    const depositMatch = productName.match(/\[DEPOSIT\]\s*(\d+)/);
                    if (depositMatch) amountToAdd = Number(depositMatch[1]);
                    const { data: existingTx } = await supabase.from('wallet_transactions')
                        .select('id')
                        .eq('description', `Top Up Saldo via QRIS Otomatis (Ref: ${order_id})`)
                        .maybeSingle();
                    if (!existingTx) {
                        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
                        const newBalance = (Number(profile?.balance) || 0) + amountToAdd;
                        await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
                        await supabase.from('wallet_transactions').insert({
                            user_id: userId,
                            amount: amountToAdd,
                            type: 'INCOME',
                            description: `Top Up Saldo via QRIS Otomatis (Ref: ${order_id})`
                        });
                    }
                    await supabase.from(targetTable).update({ status: 'selesai' }).eq('id', order_id);
                } 
                else if (productName.includes('[VIP]') && targetTable === 'orders') {
                    const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();
                    let waktuSekarang = new Date();
                    let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();
                    if (waktuExpired < waktuSekarang) waktuExpired = waktuSekarang;
                    if (productName.includes('1 Tahun')) waktuExpired.setDate(waktuExpired.getDate() + 365);
                    else {
                        const match = productName.match(/(\d+)\s+Bulan/i);
                        if (match) waktuExpired.setDate(waktuExpired.getDate() + (parseInt(match[1]) * 30));
                        else waktuExpired.setDate(waktuExpired.getDate() + 30);
                    }
                    await supabase.from('profiles').update({ is_seller: true, seller_expired_at: waktuExpired.toISOString() }).eq('id', userId);
                    let updatePayload = { status: 'selesai' };
                    if (targetTable === 'orders_player') updatePayload.waktu_selesai = new Date().toISOString();
                    await supabase.from(targetTable).update(updatePayload).eq('id', order_id);
                }
                else {
                    await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
                }
                return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Lunas via Jemput Bola' });
            }
            if (statusXoftware === 'FAILED' || paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') {
                await supabase.from(targetTable).update({ status: 'DIBATALKAN' }).eq('id', order_id);
                return res.status(200).json({ success: true, status: 'FAILED', message: 'Dibatalkan' });
            }
            return res.status(200).json({ success: true, status: 'PENDING', pesan_rahasia_xoftware: dataXoftware });
        } catch (error) {
            return res.status(500).json({ success: false, status: 'ERROR', message: error.message });
        }
    }
    else {
        return res.status(400).json({ success: false, message: 'Parameter action tidak ditemukan atau tidak valid.' });
    }
}
