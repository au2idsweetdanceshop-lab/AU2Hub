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
    
    // Titik API untuk nanya status ke Xoftware (Cek berdasarkan order_id / ref_id)
    const path = `/v1/api/transactions/${order_id}`; 
    const messageToSign = `${timestamp}\nGET\n${path}\n`;
    const signature = crypto.createHmac('sha256', apiKey).update(messageToSign, 'utf8').digest('base64');

    try {
        const response = await fetch(`${baseUrl}${path}`, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey, 'X-Timestamp': timestamp, 'X-Signature': signature }
        });
        const result = await response.json();
        
        // Cari statusnya di respon Xoftware
        const statusXoftware = result.status || (result.data && result.data.status) || 'PENDING';

        // JIKA LUNAS, KITA UPDATE DATABASE DETIK ITU JUGA!
        if (statusXoftware.toUpperCase() === 'SUCCESS' || statusXoftware.toUpperCase() === 'PAID') {
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
            return res.status(200).json({ success: true, status: 'SUCCESS' });
        }

        return res.status(200).json({ success: true, status: 'PENDING' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
