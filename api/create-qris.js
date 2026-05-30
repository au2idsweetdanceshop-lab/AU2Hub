import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

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
        const { data: orderPlayer } = await supabase.from('orders_player').select('*').eq('id', order_id).single();
        
        if (orderPlayer) {
            orderData = orderPlayer;
            isPasarPlayer = true;
        } else {
            const { data: orderAdmin } = await supabase.from('orders').select('*').eq('id', order_id).single();
            if (orderAdmin) orderData = orderAdmin;
        }

        if (!orderData) {
            return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
        }

        let finalVerifiedPrice = parseInt(orderData.price); 

        // =================================================================
        // 🛡️ FITUR KEAMANAN MUTLAK: VALIDASI HARGA ASLI (SOURCE OF TRUTH)
        // =================================================================
        if (isPasarPlayer && orderData.product_id) {
            const { data: productMaster, error: errMaster } = await supabase
                .from('player_products')
                .select('price')
                .eq('id', orderData.product_id)
                .single();

            if (errMaster || !productMaster) {
                return res.status(400).json({ success: false, message: 'Produk asli tidak ditemukan.' });
            }

            const basePrice = parseInt(productMaster.price);
            const expectedPrice = Math.floor(basePrice + 650 + (basePrice * 0.007));

            if (finalVerifiedPrice !== expectedPrice) {
                console.error(`[HACK ATTEMPT!] User: ${orderData.user_id} mengubah harga pasar dari ${expectedPrice} menjadi ${finalVerifiedPrice}`);
                await supabase.from('orders_player').delete().eq('id', order_id);
                return res.status(400).json({ success: false, message: 'Terdeteksi manipulasi harga! Transaksi digagalkan.' });
            }
            
            finalVerifiedPrice = expectedPrice;
        } else {
            if (finalVerifiedPrice < 1000) {
                console.error(`[HACK ATTEMPT!] Order Admin tidak wajar. Harga: Rp ${finalVerifiedPrice}`);
                await supabase.from('orders').delete().eq('id', order_id);
                return res.status(400).json({ success: false, message: 'Harga di bawah batas minimal sistem!' });
            }
        }
        // =================================================================

        const safeCustomerId = orderData.user_id ? String(orderData.user_id).slice(0, 8) : "UNKNOWN";
        const safeProductId = orderData.product_id ? String(orderData.product_id).slice(0, 20) : "SKU-001";

        // SUSUN PAYLOAD KE XOFTWARE
        const payload = {
            merchant_id: 129, 
            channel_code: "REALTIME", 
            amount: finalVerifiedPrice, 
            ref_id: order_id, 
            fee_direction: "merchant", 
            notify_url: "https://au2idsweetdance.com/api/webhook", 
            note: `Pembayaran: ${product_name || 'AU2Hub Order'}`, 
            
            // 🛠️ PERBAIKAN BERDASARKAN DOKUMENTASI RESMI
            metadata: {
                customer: {
                    id: `CUST-${safeCustomerId}`, 
                    name: customer_name || "Player AU2Hub",
                    phone: "081234567890",
                    email: "buyer@au2hub.com"
                },
                // Sistem Xoftware meminta "minimal 1 item" di dalam produk
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
        console.error("QRIS Error:", error);
        return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server." });
    }
}
