import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Gunakan Service Role Key agar punya akses 'Dewa' menembus RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const callbackData = req.body;
    const privateKey = process.env.XOFTWARE_PRIVATE_KEY;

    // 1. VALIDASI KEASLIAN (SANGAT KRUSIAL!)
    // Cek dokumentasi: Xoftware biasanya mengirimkan 'signature' di dalam body atau headers.
    // Cocokkan signature dari Xoftware dengan kalkulasi di server kamu untuk mencegah hacker.
    
    // Contoh validasi (sesuaikan dengan rumus Xoftware):
    const expectedSignature = crypto.createHash('sha256')
        .update(`${callbackData.merchant_ref}${callbackData.amount}${callbackData.status}${privateKey}`)
        .digest('hex');

    // Jika signature tidak cocok, tendang!
    if (callbackData.signature !== expectedSignature) {
        return res.status(403).json({ success: false, message: 'Invalid Signature' });
    }

    // 2. JIKA PEMBAYARAN BERHASIL, UPDATE DATABASE
    if (callbackData.status === 'PAID' || callbackData.status === 'SUCCESS') {
        const orderId = callbackData.merchant_ref; // ID dari transaksi kamu

        // Karena kamu punya dua tabel (orders dan orders_player), 
        // kita bisa update keduanya (yang error biarkan saja gagal).
        await supabase.from('orders').update({ status: 'SUCCESS' }).eq('id', orderId);
        await supabase.from('orders_player').update({ status: 'SUCCESS' }).eq('id', orderId);
        
        // Kembalikan response 200 OK agar Xoftware tahu Webhook berhasil diterima
        return res.status(200).json({ success: true, message: 'Callback received and processed' });
    }

    return res.status(200).json({ success: true, message: 'Ignored status' });
}
