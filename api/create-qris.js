import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// RUMUS POTONGAN SELLER (SAMA PERSIS DGN APP.JS)
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

    const { order_id, product_name, customer_name } = req.body; 
    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         

    try {
        let orderData = null;
        let isPasarPlayer = false;

        // 1. Cari Pesanan di Database
        const { data: orderPlayer, error: errOrderPlayer } = await supabase.from('orders_player').select('*').eq('id', order_id).single();
        
        if (orderPlayer) {
            orderData = orderPlayer;
            isPasarPlayer = true;
        } else {
            const { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', order_id).single();
            if (orderAdmin) orderData = orderAdmin;
        }

        if (!orderData) {
            return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan di sistem.' });
        }

        let finalVerifiedPrice = parseInt(orderData.price); 

        // =================================================================
        // 🛡️ FITUR KEAMANAN MUTLAK: VALIDASI HARGA ASLI (SOURCE OF TRUTH)
        // =================================================================
        if (isPasarPlayer && orderData.product_id) {
            
            // PERBAIKAN: Gunakan select('*') agar tidak crash jika ada kolom yang belum dibuat di Supabase
            const { data: productMaster, error: errMaster } = await supabase
                .from('player_products')
                .select('*')
                .eq('id', orderData.product_id)
                .single();

            // PERBAIKAN: Tampilkan error asli DB ke Log Vercel
            if (errMaster || !productMaster) {
                console.error("DB Error (Master Product):", errMaster);
                return res.status(400).json({ success: false, message: 'Produk asli tidak ditemukan.' });
            }

            // Kumpulkan semua daftar harga yang SAH (Harga utama + Harga Variasi)
            let validUnitPrices = [];

            // A. Kalkulasi Harga Utama
            let baseHarga = parseInt(productMaster.price);
            if (productMaster.fee_ditanggung_pembeli === true) {
                baseHarga += hitungPotonganSeller(baseHarga);
            }
            let hargaCustomerUtama = Math.floor(baseHarga + (baseHarga * 0.007) + 500);
            validUnitPrices.push(hargaCustomerUtama);

            // B. Kalkulasi Harga Variasi (Aman dari error walau kolom variasi tidak ada)
            let rawVariasi = productMaster.variations || productMaster.variasi || [];
            if (Array.isArray(rawVariasi)) {
                rawVariasi.forEach(v => {
                    if (typeof v === 'object' && v !== null) {
                        let hargaVarAsli = parseFloat(v.harga || v.price || 0);
                        if (productMaster.fee_ditanggung_pembeli === true) {
                            hargaVarAsli += hitungPotonganSeller(hargaVarAsli);
                        }
                        let hargaVarMarkup = Math.floor(hargaVarAsli + (hargaVarAsli * 0.007) + 500);
                        validUnitPrices.push(hargaVarMarkup);
                    }
                });
            }

            // C. Deteksi Kuantitas (QTY) dari nama produk
            let qty = 1;
            const namaProduk = orderData.product_name || "";
            const qtyMatch = namaProduk.match(/\(x(\d+)\)$/);
            if (qtyMatch) {
                qty = parseInt(qtyMatch[1]);
            }

            // D. Pengecekan Final
            const calculatedUnitPrice = finalVerifiedPrice / qty;

            if (!validUnitPrices.includes(calculatedUnitPrice)) {
                console.error(`[HACK ATTEMPT!] Harga Masuk: ${calculatedUnitPrice} | Harga Asli DB: ${validUnitPrices.join(', ')}`);
                await supabase.from('orders_player').delete().eq('id', order_id);
                return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi harga! Transaksi digagalkan.' });
            }

        } else {
            // Keamanan untuk Toko Admin
            if (finalVerifiedPrice < 1000) {
                await supabase.from('orders').delete().eq('id', order_id);
                return res.status(400).json({ success: false, message: 'Harga di bawah batas minimal sistem!' });
            }
        }
        // =================================================================

        const safeCustomerId = orderData.user_id ? String(orderData.user_id).slice(0, 8) : "UNKNOWN";
        const safeProductId = orderData.product_id ? String(orderData.product_id).slice(0, 20) : "SKU-001";
        const finalCustomerName = (customer_name && customer_name.trim() !== "") ? customer_name : "Player AU2Hub";

        // SUSUN PAYLOAD KE XOFTWARE
        const payload = {
            merchant_id: 129, 
            channel_code: "QRISREALTIME", 
            amount: finalVerifiedPrice, 
            ref_id: order_id, 
            fee_direction: "merchant", 
            notify_url: "https://au2idsweetdance.com/api/webhook", 
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

        // TEMBAK API XOFTWARE
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

        const dataXoftware = await response.json();
        const qrisString = dataXoftware.qris_text || (dataXoftware.data && dataXoftware.data.qris_text);

        if (qrisString) {
            return res.status(200).json({
                success: true,
                qris_string: qrisString 
            });
        } else {
            console.error("Xoftware API Error:", dataXoftware);
            return res.status(502).json({ success: false, message: 'Gagal mendapatkan QRIS dari Provider.' });
        }

    } catch (error) {
        console.error("QRIS Server Error:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server." });
    }
}
