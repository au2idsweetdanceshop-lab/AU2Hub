import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// RUMUS POTONGAN SELLER
// ==========================================
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
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, product_name, customer_name, amount } = req.body; 
    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         

    try {
        let orderData = null;
        let isPasarPlayer = false;

        // 1. Cari Pesanan di Database
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

        // Variabel untuk harga bersih yang akan dikirim ke Payment Gateway
        let finalVerifiedPrice = parseInt(orderData.price); 

        // =================================================================
        // 🛡️ FITUR KEAMANAN MUTLAK: VALIDASI HARGA ASLI (SOURCE OF TRUTH)
        // =================================================================
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
            
            // Validasi Fee Ditanggung Pembeli
            if (productMaster.fee_ditanggung_pembeli === true || String(productMaster.fee_ditanggung_pembeli) === "true") {
                baseHarga += hitungPotonganSeller(baseHarga);
            }
            
            // Perhitungkan mark-up sistem
            let hargaCustomerUtama = Math.floor(baseHarga + (baseHarga * 0.007) + 500);
            validUnitPrices.push(hargaCustomerUtama);

            // Validasi Harga Variasi
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
            
            // Ekstrak Quantity (misal: "Pedang Legendaris (x2)")
            const qtyMatch = namaProduk.match(/\(x(\d+)\)/);
            if (qtyMatch) {
                qty = parseInt(qtyMatch[1]);
            }

            let hargaTanpaRekber = finalVerifiedPrice;

            // Potong uang Rekber sebelum dicocokkan dengan harga database
            if (namaProduk && namaProduk.includes('[+Rekber]')) {
                if (hargaTanpaRekber >= 2035000) hargaTanpaRekber -= 35000;
                else if (hargaTanpaRekber >= 1525000) hargaTanpaRekber -= 25000;
                else if (hargaTanpaRekber >= 520000) hargaTanpaRekber -= 20000;
                else if (hargaTanpaRekber >= 110000) hargaTanpaRekber -= 10000;
                else hargaTanpaRekber -= 5000;
            }

            // Hitung harga satuan murni
            const calculatedUnitPrice = hargaTanpaRekber / qty;

            if (!validUnitPrices.includes(calculatedUnitPrice)) {
                console.error(`[HACK ATTEMPT PASAR PLAYER!] Harga Tanpa Rekber: ${hargaTanpaRekber} | QTY: ${qty} | Harga Asli DB: ${validUnitPrices.join(', ')}`);
                await supabase.from('orders_player').delete().eq('id', order_id);
                return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi harga! Transaksi otomatis digagalkan demi keamanan.' });
            }
            
            // JIKA LOLOS, TIMPA finalVerifiedPrice DENGAN HARGA PASTI (Meskipun harganya sama, ini untuk keamanan ekstra)
            finalVerifiedPrice = parseInt(orderData.price);

        } else if (orderData.product_name && orderData.product_name.startsWith('[DEPOSIT]')) {
            // ========================================================
            // 🛡️ KEAMANAN BARU: VALIDASI TOP UP SALDO DOMPET SELLER
            // ========================================================
            const depositMatch = orderData.product_name.match(/\[DEPOSIT\]\s*(\d+)/);
            if (!depositMatch) {
                 return res.status(400).json({ success: false, message: 'Format top up tidak valid.' });
            }

            const nominalMurniDeposit = parseInt(depositMatch[1]);
            const feeSistemDeposit = 500 + Math.floor(nominalMurniDeposit * 0.007);
            const hargaYangSeharusnya = nominalMurniDeposit + feeSistemDeposit;

            if (finalVerifiedPrice !== hargaYangSeharusnya) {
                console.error(`[HACK ATTEMPT DEPOSIT!] User mencoba top up Rp ${nominalMurniDeposit} tapi mengirim harga Rp ${finalVerifiedPrice}. (Seharusnya Rp ${hargaYangSeharusnya})`);
                await supabase.from('orders').delete().eq('id', order_id);
                return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi nominal pembayaran!' });
            }
            // JIKA LOLOS
            finalVerifiedPrice = hargaYangSeharusnya;

        } else if (orderData.product_name && orderData.product_name.includes('[VIP]')) {
             // ========================================================
             // 🛡️ KEAMANAN BARU: VALIDASI PEMBELIAN VIP SELLER
             // ========================================================
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
                     await supabase.from('orders').delete().eq('id', order_id);
                     return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi nominal langganan!' });
                 }
                 // JIKA LOLOS
                 finalVerifiedPrice = hargaVipSeharusnya;
             }
        } else {
            // Validasi Umum (HANYA BISA MASUK SINI JIKA BUKAN PASAR, BUKAN VIP, BUKAN DEPOSIT)
            // KITA TOLAK MUTLAK JIKA ADA PRODUK LAIN SELAIN 3 DI ATAS YANG MASUK!
            console.error(`[HACK ATTEMPT UNKNOWN!] Terdeteksi pembelian produk tidak dikenal: ${orderData.product_name}`);
            await supabase.from('orders').delete().eq('id', order_id);
            return res.status(400).json({ success: false, message: 'Produk tidak valid atau tidak dikenali sistem.' });
        }
        // =================================================================


        // Persiapan Payload untuk Xoftware PG
        const safeCustomerId = orderData.user_id ? String(orderData.user_id).slice(0, 8) : "UNKNOWN";
        const safeProductId = orderData.product_id ? String(orderData.product_id).slice(0, 20) : "SKU-001";
        const finalCustomerName = (customer_name && customer_name.trim() !== "") ? customer_name : "Player AU2Hub";

        const payload = {
            merchant_id: 129, 
            channel_code: "QRISREALTIME", 
            amount: finalVerifiedPrice, // 🛡️ SEKARANG AMAN! Menggunakan harga yang SUDAH DIPASTIKAN VALID
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

        // Tembak API Xoftware
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
