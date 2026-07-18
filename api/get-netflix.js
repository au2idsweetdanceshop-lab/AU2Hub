import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
export default async function handler(req, res) {
    const origin = req.headers.origin || req.headers.referer;
    const isWebhook = (req.body && req.body.action === 'webhook') || req.url.includes('webhook');
    if (!isWebhook && origin) {
        if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {
            return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });
        }
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, message: 'Token kosong!' });
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    try {
        const { data: tokenData, error } = await supabase
            .from('netflix_tokens')
            .select('*')
            .eq('token', token)
            .single();
        if (error || !tokenData) {
            return res.status(404).json({ success: false, message: 'Token tidak ditemukan.' });
        }
        if (tokenData.status === 'hangus') {
            return res.status(403).json({ success: false, message: 'Token sudah terpakai/hangus!' });
        }
        const oauth2Client = new google.auth.OAuth2(
            process.env.GMAIL_CLIENT_ID,
            process.env.GMAIL_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: 'from:info@account.netflix.com is:unread',
            maxResults: 1
        });
        const messages = response.data.messages;
        if (!messages || messages.length === 0) {
            return res.status(404).json({ success: false, message: 'Kode belum masuk ke email. Coba klik kirim ulang kode di TV/HP Anda.' });
        }
        const msg = await gmail.users.messages.get({ userId: 'me', id: messages[0].id });
        const snippet = msg.data.snippet;
        const codeMatch = snippet.match(/\b\d{4}\b/);
        if (!codeMatch) {
            return res.status(500).json({ success: false, message: 'Gagal menemukan angka kode dalam email.' });
        }
        const netflixCode = codeMatch[0];
        await gmail.users.messages.modify({
            userId: 'me',
            id: messages[0].id,
            requestBody: {
                removeLabelIds: ['UNREAD']
            }
        });
        await supabase
            .from('netflix_tokens')
            .update({ status: 'hangus' })
            .eq('token', token);
        return res.status(200).json({ success: true, code: netflixCode });
    } catch (err) {
        console.error("Netflix API Error:", err);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem internal.' });
    }
}
