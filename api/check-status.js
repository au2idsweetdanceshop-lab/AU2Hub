import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Abaikan method selain GET biar aman
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const { order_id, table } = req.query;
    if (!order_id) return res.status(400).json({ message: 'Missing order_id' });

    const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';
    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    try {
        // Kita ubah tebakan API-nya pakai pencarian ref_id
        const path = `/v1/api/transactions?ref_id=${order_id}`; 
        
        const messageToSign = `${timestamp}\nGET\n${path}\n`;
        const signature = crypto.createHmac('sha256', apiKey).update(messageToSign, 'utf8').digest('base64');

        const response = await fetch(`${baseUrl}${path}`, {
            method: 'GET',
            headers: { 
                'X-API-Key': apiKey, 
                'X-Timestamp': timestamp, 
                'X-Signature': signature 
            }
        });
        
        // BACA MENTAH-MENTAH DULU BIAR GAK CRASH
        const rawText = await response.text();
        console.log(`🔍 Balasan Xoftware untuk order ${order_id}:`, rawText);

        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            console.error("❌ Xoftware tidak membalas dengan JSON:", rawText);
            // Tetap kasih 200 PENDING agar web pembeli nggak ikutan crash
            return res.status(200).json({ success: false, status: 'PENDING', message: 'Respons bukan JSON' });
        }
        
        // Cari statusnya di respon Xoftware (Mengantisipasi berbagai struktur)
        const statusXoftware = result.status || (result.data && result.data.status) || (result.data && result.data[0] && result.data[0].status) || 'PENDING';

        // JIKA LUNAS, KITA UPDATE DATABASE DETIK ITU JUGA!
        if (statusXoftware.toUpperCase() === 'SUCCESS' || statusXoftware.toUpperCase() === 'PAID') {
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
            return res.status(200).json({ success: true, status: 'SUCCESS' });
        }

        return res.status(200).json({ success: true, status: 'PENDING' });
        
    } catch (error) {
        console.error("🔥 CRITICAL ERROR:", error.message);
        // Jangan 500, kasih 200 biar front-end aman nunggu webhook
        return res.status(200).json({ success: false, status: 'PENDING', message: error.message });
    }
}
