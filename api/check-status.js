import { createClient } from '@supabase/supabase-js';

// Gunakan Service Role Key agar punya akses 'Dewa' menembus RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // =================================================================
    // 🔥 WAJIB: MATIKAN CACHE VERCEL & BROWSER (ANTI GET 304)
    // Agar setiap polling benar-benar mengambil data terbaru dari database
    // =================================================================
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Endpoint ini hanya bertugas melayani method GET dari aplikasi frontend 
    // (Interval jemput bola & tombol "Saya Sudah Bayar")
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { order_id, table } = req.query;

    if (!order_id) {
        return res.status(400).json({ success: false, message: 'Missing order_id' });
    }

    const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';

    try {
        // =================================================================
        // 🔍 CEK STATUS LANGSUNG KE DATABASE SUPABASE
        // =================================================================
        // Karena api/webhook.js sudah bekerja secara instan mengupdate database, 
        // kita jadikan Supabase sebagai SUMBER KEBENARAN mutlak (Source of Truth).
        
        const { data: existingOrder, error } = await supabase
            .from(targetTable)
            .select('status')
            .eq('id', order_id)
            .single();

        if (error || !existingOrder) {
            return res.status(404).json({ success: false, status: 'ERROR', message: 'Pesanan tidak ditemukan di database' });
        }

        const currentStatus = String(existingOrder.status).toUpperCase();

        // Jika Webhook Xoftware sudah sukses mengubah status di database menjadi lunas
        if (currentStatus === 'SUCCESS' || currentStatus === 'SELESAI' || currentStatus === 'PROSES' || currentStatus === 'PAID') {
            return res.status(200).json({ 
                success: true, 
                status: 'SUCCESS', // <-- Kata kunci ini akan memicu Layar Hijau Sukses di aplikasi
                message: 'Pembayaran telah lunas dan dikonfirmasi' 
            });
        }

        // Jika status di database masih PENDING
        return res.status(200).json({ 
            success: true, 
            status: 'PENDING', 
            message: 'Menunggu pembayaran masuk...' 
        });

    } catch (error) {
        console.error("🔥 Cek Status Error:", error.message);
        return res.status(500).json({ success: false, status: 'ERROR', message: error.message });
    }
}
