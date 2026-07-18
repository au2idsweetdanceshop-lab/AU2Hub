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
                return res.status(400).json({ success: false, message: 'Produk referensi asli tidak ditemukan.' });
            }
            let validUnitPrices = [];
            let baseHarga = parseInt(productMaster.price);
            if (productMaster.fee_ditanggung_pembeli === true || String(productMaster.fee_ditanggung_pembeli) === "true") {
                baseHarga += hitungPotonganSeller(baseHarga);
            }
            let hargaCustomerUtama;
            if (baseHarga < 250000) hargaCustomerUtama = Math.floor(baseHarga + (baseHarga * 0.008) + 500);
            else hargaCustomerUtama = Math.floor(baseHarga + (baseHarga * 0.01));
            validUnitPrices.push(hargaCustomerUtama);
            let rawVariasi = productMaster.variations || productMaster.variasi || [];
            if (Array.isArray(rawVariasi)) {
                rawVariasi.forEach(v => {
                    if (typeof v === 'object' && v !== null) {
                        let hargaVarAsli = parseFloat(v.harga || v.price || 0);
                        if (productMaster.fee_ditanggung_pembeli === true || String(productMaster.fee_ditanggung_pembeli) === "true") {
                            hargaVarAsli += hitungPotonganSeller(hargaVarAsli);
                        }
                        let hargaVarMarkup;
                        if (hargaVarAsli < 250000) hargaVarMarkup = Math.floor(hargaVarAsli + (hargaVarAsli * 0.008) + 500);
                        else hargaVarMarkup = Math.floor(hargaVarAsli + (hargaVarAsli * 0.01));
                        validUnitPrices.push(hargaVarMarkup);
                    }
                });
            }
            let qty = 1;
            const namaProduk = orderData.product_name || "";
            const qtyMatch = namaProduk.match(/\(x(\d+)\)/);
            if (qtyMatch) {
                qty = parseInt(qtyMatch[1]);
                if (qty <= 0) qty = 1; // FIX: Mencegah error Division by Zero jika qty 0
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
            if (!depositMatch) return res.status(400).json({ success: false, message: 'Format top up tidak valid.' });
            const nominalMurniDeposit = parseInt(depositMatch[1]);
            if (nominalMurniDeposit < 10000) {
                return res.status(400).json({ success: false, message: 'Minimal Deposit adalah Rp 10.000!' });
            }
            let feeSistemDeposit;
            if (nominalMurniDeposit < 250000) feeSistemDeposit = Math.floor(nominalMurniDeposit * 0.008) + 500;
            else feeSistemDeposit = Math.floor(nominalMurniDeposit * 0.01);
            const hargaYangSeharusnya = nominalMurniDeposit + feeSistemDeposit;
            if (finalVerifiedPrice !== hargaYangSeharusnya) {
                console.error(`[HACK ATTEMPT DEPOSIT!] User mencoba top up Rp ${nominalMurniDeposit} tapi mengirim harga Rp ${finalVerifiedPrice}.`);
                return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi nominal pembayaran!' });
            }
            finalVerifiedPrice = hargaYangSeharusnya;
        } else if (orderData.product_name && orderData.product_name.includes('[VIP]')) {
             let hargaVipMurni = 0;
             if (orderData.product_name.includes('1 Tahun')) hargaVipMurni = 333 * 365;
             else if (orderData.product_name.match(/(\d+)\s+Bulan/i)) hargaVipMurni = 333 * 30 * parseInt(orderData.product_name.match(/(\d+)\s+Bulan/i)[1]);
             else if (orderData.product_name.match(/(\d+)\s+Hari/i)) hargaVipMurni = 333 * parseInt(orderData.product_name.match(/(\d+)\s+Hari/i)[1]);
             if (hargaVipMurni > 0) {
                 let feeSistemVip;
                 if (hargaVipMurni < 250000) feeSistemVip = Math.floor(hargaVipMurni * 0.008) + 500;
                 else feeSistemVip = Math.floor(hargaVipMurni * 0.01);
                 const hargaVipSeharusnya = hargaVipMurni + feeSistemVip;
                 if (finalVerifiedPrice !== hargaVipSeharusnya) {
                     console.error(`[HACK ATTEMPT VIP!] Terdeteksi manipulasi harga VIP.`);
                     return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi nominal langganan!' });
                 }
                 finalVerifiedPrice = hargaVipSeharusnya;
             }
        } else {
            console.error(`[HACK ATTEMPT UNKNOWN!] Pembelian produk tidak dikenal: ${orderData.product_name}`);
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
            return res.status(200).json({
                success: true,
                qris_string: qrisString 
            });
        } else {
            console.error("Xoftware API Error Detailed:", dataXoftware);
            return res.status(400).json({ 
                success: false, 
                message: dataXoftware.message || dataXoftware.error || 'Provider Gateway menolak memproses pesanan ini.' 
            });
        }
    } catch (error) {
        console.error("QRIS Server Error:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan internal pada server backend." });
    }
}
