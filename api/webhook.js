import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Gunakan Service Role Key agar punya akses 'Dewa' menembus RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
    // Webhook selalu menggunakan metode POST
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const callbackData = req.body;
    const apiKey = process.env.XOFTWARE_API_KEY; // Gunakan API Key kamu untuk HMAC

    // ==========================================
    // 1. VALIDASI KEASLIAN (HMAC-SHA256)
    // ==========================================
    // Cek header dari Xoftware. Biasanya mereka menyisipkan signature di header.
    // Jika di dokumentasi mereka naruhnya di body, ganti jadi callbackData.signature
    const receivedSignature = req.headers['x-signature'] || req.headers['x-callback-signature'] || callbackData.signature;

    if (receivedSignature) {
        // Standar umum webhook: melakukan HMAC-SHA256 dari raw body JSON
        const payloadString = JSON.stringify(callbackData);
        const expectedSignature = crypto
            .createHmac('sha256', apiKey)
            .update(payloadString)
            .digest('hex');

        // Catatan: Jika Xoftware meminta rumus khusus (misal: ref_id + amount), 
        // ubah `payloadString` di atas menjadi rumus tersebut.
        /* 
        // Buka blokir validasi ini jika format signature Xoftware sudah dipastikan sama
        if (receivedSignature !== expectedSignature) {
            console.error("HACKER TERDETEKSI: Signature tidak cocok!");
            return res.status(403).json({ success: false, message: 'Invalid Signature' });
        }
        */
    }

    // ==========================================
    // 2. JIKA PEMBAYARAN BERHASIL, UPDATE DATABASE
    // ==========================================
    // Xoftware menggunakan "SUCCESS" untuk status transaksi, dan "SUCCEEDED" untuk payment_status
    if (callbackData.status === 'SUCCESS' || callbackData.payment_status === 'SUCCEEDED') {
        
        // Di dokumen Xoftware, ID pesanan kamu dikirim balik dengan nama 'ref_id'
        const orderId = callbackData.ref_id; 

        if (!orderId) {
            return res.status(400).json({ success: false, message: 'ref_id tidak ditemukan di payload' });
        }

        // Eksekusi Update ke Supabase
        // Karena ada dua tabel (orders & orders_player), tembak keduanya. 
        // Yang orderId-nya tidak cocok otomatis akan diabaikan oleh database.
        const { error: err1 } = await supabase.from('orders').update({ status: 'SUCCESS' }).eq('id', orderId);
        const { error: err2 } = await supabase.from('orders_player').update({ status: 'SUCCESS' }).eq('id', orderId);
        
        if (err1 && err2) {
            console.error("Gagal update database:", err1, err2);
        } else {
            console.log(`Pembayaran untuk order ${orderId} berhasil diproses.`);
        }

        // Wajib mengembalikan status 200 OK agar server Xoftware berhenti mengirim notifikasi berulang-ulang
        return res.status(200).json({ success: true, message: 'Callback received and processed' });
    }

    // Jika statusnya PENDING atau FAILED, abaikan saja
    return res.status(200).json({ success: true, message: 'Ignored status: ' + callbackData.status });
}
