import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

    const { order_id, table } = req.query;
    if (!order_id) return res.status(400).json({ success: false, message: 'Missing order_id' });

    const targetTable = table === 'orders_player' ? 'orders_player' : 'orders';

    try {
        const { data: existingOrder, error } = await supabase.from(targetTable).select('*').eq('id', order_id).single();
        if (error || !existingOrder) return res.status(404).json({ success: false, status: 'ERROR', message: 'Pesanan tidak ditemukan' });

        const currentDbStatus = String(existingOrder.status).toUpperCase();
        if (currentDbStatus === 'SUCCESS' || currentDbStatus === 'SELESAI' || currentDbStatus === 'PROSES' || currentDbStatus === 'PAID') {
            return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Sudah lunas' });
        }

        const baseUrl = process.env.XOFTWARE_BASE_URL;
        const apiKey = process.env.XOFTWARE_API_KEY;

        const payload = { ref_id: order_id };
        const payloadString = JSON.stringify(payload);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const method = 'POST';
        const path = '/v1/api/transactions/status';
        
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

        const textResponse = await response.text();
        let dataXoftware;
        try {
            dataXoftware = JSON.parse(textResponse);
        } catch (e) {
            return res.status(200).json({ success: true, status: 'PENDING', message: 'Provider Gateway error format' });
        }

        const statusXoftware = String(dataXoftware.status || dataXoftware.data?.status || '').toUpperCase();
        const paymentStatus = String(dataXoftware.payment_status || dataXoftware.data?.payment_status || '').toUpperCase();
        const statusTrans = String(dataXoftware.transaction_status || dataXoftware.data?.transaction_status || '').toUpperCase();

        if (
            statusXoftware === 'SUCCESS' || statusXoftware === 'PAID' || statusXoftware === 'SETTLED' || 
            paymentStatus === 'SUCCEEDED' || paymentStatus === 'SETTLED' || paymentStatus === 'SUCCESS' ||
            statusTrans === 'SUCCESS' || statusTrans === 'SETTLED'
        ) {
            const productName = existingOrder.product_name || '';
            const userId = existingOrder.user_id;
            const pricePaid = Number(existingOrder.price);

            // ========================================================
            // 💰 JALUR 1: TOP UP SALDO OTOMATIS (TANPA RPC SUPABASE)
            // ========================================================
            if (productName.startsWith('[DEPOSIT]')) {
                let amountToAdd = pricePaid; 
                const depositMatch = productName.match(/\[DEPOSIT\]\s*(\d+)/);
                if (depositMatch) amountToAdd = Number(depositMatch[1]);

                const { data: existingTx } = await supabase.from('wallet_transactions')
                    .select('id')
                    .eq('description', `Top Up Saldo via QRIS Otomatis (Ref: ${order_id})`)
                    .maybeSingle();

                if (!existingTx) {
                    // 🔥 SULAP JS: Tarik saldo asli, jumlahkan di JS, lempar balik ke Supabase!
                    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
                    const newBalance = (Number(profile?.balance) || 0) + amountToAdd;
                    
                    await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);

                    await supabase.from('wallet_transactions').insert({
                        user_id: userId,
                        amount: amountToAdd,
                        type: 'INCOME',
                        description: `Top Up Saldo via QRIS Otomatis (Ref: ${order_id})`
                    });
                }
                
                await supabase.from(targetTable).update({ status: 'selesai' }).eq('id', order_id);
            } 
            
            // ========================================================
            // 👑 JALUR 2: PEMBELIAN VIP SELLER
            // ========================================================
            else if (productName.includes('[VIP]') && targetTable === 'orders') {
                const { data: profile } = await supabase.from('profiles').select('seller_expired_at').eq('id', userId).single();
                let waktuSekarang = new Date();
                let waktuExpired = profile?.seller_expired_at ? new Date(profile.seller_expired_at) : new Date();
                if (waktuExpired < waktuSekarang) waktuExpired = waktuSekarang;

                if (productName.includes('1 Tahun')) waktuExpired.setDate(waktuExpired.getDate() + 365);
                else {
                    const match = productName.match(/(\d+)\s+Bulan/i);
                    if (match) waktuExpired.setDate(waktuExpired.getDate() + (parseInt(match[1]) * 30));
                    else waktuExpired.setDate(waktuExpired.getDate() + 30);
                }

                await supabase.from('profiles').update({ is_seller: true, seller_expired_at: waktuExpired.toISOString() }).eq('id', userId);
                let updatePayload = { status: 'selesai' };
                if (targetTable === 'orders_player') updatePayload.waktu_selesai = new Date().toISOString();
                
                await supabase.from(targetTable).update(updatePayload).eq('id', order_id);
            } 
            // 📦 JALUR 3: ORDER BIASA & PASAR PLAYER
            else {
                await supabase.from(targetTable).update({ status: 'SUCCESS' }).eq('id', order_id);
            }

            return res.status(200).json({ success: true, status: 'SUCCESS', message: 'Lunas via Jemput Bola' });
        }

        if (statusXoftware === 'FAILED' || paymentStatus === 'FAILED' || paymentStatus === 'EXPIRED') {
            await supabase.from(targetTable).update({ status: 'DIBATALKAN' }).eq('id', order_id);
            return res.status(200).json({ success: true, status: 'FAILED', message: 'Dibatalkan' });
        }

        return res.status(200).json({ success: true, status: 'PENDING', pesan_rahasia_xoftware: dataXoftware });

    } catch (error) {
        return res.status(500).json({ success: false, status: 'ERROR', message: error.message });
    }
}
