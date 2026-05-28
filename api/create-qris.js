import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase di sisi Server (Backend)
// WAJIB: Tambahkan variabel ini di menu "Environment Variables" Vercel Anda!
const supabaseUrl = process.env.SUPABASE_URL; 
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Disarankan pakai Service Role Key agar punya akses penuh
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, amount, product_name, customer_name } = req.body;

    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         

    try {
        // =================================================================
        // 🛡️ FITUR KEAMANAN: VALIDASI HARGA LANGSUNG DARI DATABASE
        // =================================================================
        let realPrice = 0;
        let orderData = null;

        // 1. Coba cari pesanan di tabel Pasar Player
        const { data: orderPlayer, error: errPlayer } = await supabase
            .from('orders_player')
            .select('price')
            .eq('id', order_id)
            .single();

        if (orderPlayer) {
            orderData = orderPlayer;
        } else {
            // 2. Jika tidak ada, cari di tabel Layanan Admin
            const { data: orderAdmin, error: errAdmin } = await supabase
                .from('orders')
                .select('price')
                .eq('id', order_id)
                .single();
                
            if (orderAdmin) orderData = orderAdmin;
        }

        // Jika ID Pesanan fiktif (tidak ditemukan di kedua tabel)
        if (!orderData) {
            console.error(`[SECURITY] Pesanan ${order_id} tidak ditemukan di Database!`);
            return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan.' });
        }

        realPrice = parseInt(orderData.price);

        // 3. Bandingkan Harga dari Browser vs Harga di Database
        if (parseInt(amount) !== realPrice) {
            console.error(`[HACK ATTEMPT!] Order: ${order_id} | User ngirim: ${amount} | Aslinya di DB: ${realPrice}`);
            // TOLAK TRANSAKSI SECARA PAKSA!
            return res.status(400).json({ 
                success: false, 
                message: 'Validasi gagal. Terdeteksi percobaan manipulasi harga!' 
            });
        }
        // =================================================================


        // SUSUN PAYLOAD KE XOFTWARE
        const payload = {
            merchant_id: 129, 
            channel_code: "QRIS", 
            amount: realPrice, // Menggunakan harga asli dari database (bukan dari input browser)
            ref_id: order_id, 
            fee_direction: "merchant", 
            notify_url: "https://au2idsweetdance.com/api/webhook", 
            note: `Pembayaran: ${product_name}`, 
            metadata: {
                customer: {
                    id: "CUST-" + Date.now().toString().slice(-6),
                    name: customer_name || "Player AU2Hub",
                    phone: "081234567890",
                    email: "buyer@au2hub.com"
                },
                products: [
                    {
                        product_code: "ITEM-001",
                        product_name: product_name || "Produk AU2Hub",
                        product_thumbnail: "https://placehold.co/100x100/1a1133/ff007a?text=Item",
                        product_url: "https://au2idsweetdance.com"
                    }
                ]
            }
        };

        const payloadString = JSON.stringify(payload);
        
        // WAKTU UNIX
        const timestamp = Math.floor(Date.now() / 1000).toString();

        // SIGNATURE
        const method = 'POST';
        const path = '/v1/api/transactions';
        const messageToSign = `${timestamp}\n${method}\n${path}\n${payloadString}`;

        const signature = crypto
            .createHmac('sha256', apiKey)
            .update(messageToSign, 'utf8')
            .digest('base64'); 

        // TEMBAK API
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

        // --- FIX FINAL: PENANGKAP RESPONS ANTI-GAGAL ---
        const qrisString = dataXoftware.qris_text || (dataXoftware.data && dataXoftware.data.qris_text);

        // Jika string QRIS-nya ketemu, kirim ke frontend!
        if (qrisString) {
            return res.status(200).json({
                success: true,
                qris_string: qrisString 
            });
        } else {
            throw new Error(`Berhasil masuk, tapi QRIS ngumpet: ${JSON.stringify(dataXoftware)}`);
        }

    } catch (error) {
        console.error("QRIS Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
}
