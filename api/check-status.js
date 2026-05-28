import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    const { order_id, table } = req.query; // Ambil order_id dari frontend
    const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';

    const baseUrl = process.env.XOFTWARE_BASE_URL;       
    const apiKey = process.env.XOFTWARE_API_KEY;         
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    // Sesuaikan path cek status sesuai dokumen Xoftware (biasanya /v1/api/transactions/status atau sejenisnya)
    const path = `/v1/api/transactions/${order_id}`; 
    
    try {
        const messageToSign = `${timestamp}\nGET\n${path}\n`;
        const signature = crypto.createHmac('sha256', apiKey).update(messageToSign, 'utf8').digest('base64');

        // 1. Tanya ke Xoftware status aslinya saat ini
        const response = await fetch(`${baseUrl}${path}`, {
            method: 'GET',
            headers: { 'X-API-Key': apiKey, 'X-Timestamp': timestamp, 'X-Signature': signature }
        });
        const report = await response.json();
        
        const statusXoftware = report.status || (report.data && report.data.status);

        // 2. Jika di server Xoftware statusnya LUNAS/SUCCESS
        if (statusXoftware === 'SUCCESS' || statusXoftware === 'PAID') {
            // Langsung update Supabase detik itu juga!
            await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
            return res.status(200).json({ success: true, status: 'SUCCESS' });
        }

        return res.status(200).json({ success: true, status: 'PENDING' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
