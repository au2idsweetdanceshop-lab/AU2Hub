import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    const { order_id, table } = req.query;
    if (!order_id) return res.status(400).json({ message: 'Missing order_id' });

    const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';
    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    try {
        const path = '/v1/api/transactions/status';
        const payloadObject = { ref_id: order_id };
        const payloadString = JSON.stringify(payloadObject);
        
        const method = 'POST';
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
        
        const rawText = await response.text();
        console.log(`🔍 Balasan Xoftware untuk ${order_id}:`, rawText);

        let result;
        try {
            result = JSON.parse(rawText);
        } catch (e) {
            return res.status(200).json({ success: false, status: 'PENDING', message: 'Respons bukan JSON' });
        }
        
        // 👇 FIX DI SINI COK: Kita tembusin langsung masuk ke dalam objek "data"
        const statusUtama = result.data?.status || '';
        const statusPembayaran = result.data?.payment_status || '';

        // JIKA LUNAS, KITA UPDATE DATABASE DETIK ITU JUGA!
        if (statusUtama.toUpperCase() === 'SUCCESS' || statusPembayaran.toUpperCase() === 'SUCCEEDED') {
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
            return res.status(200).json({ success: true, status: 'SUCCESS' });
        }

        return res.status(200).json({ success: true, status: 'PENDING', detail: statusUtama });
        
    } catch (error) {
        console.error("🔥 CRITICAL ERROR:", error.message);
        return res.status(200).json({ success: false, status: 'PENDING', message: error.message });
    }
}
