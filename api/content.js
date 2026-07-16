import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import Papa from 'papaparse';
export default async function handler(req, res) {
    const origin = req.headers.origin || req.headers.referer;
    const isWebhook = (req.body && req.body.action === 'webhook') || req.url.includes('webhook');
    if (!isWebhook && origin) {
        if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {
            return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });
        }
    }
    const action = req.query.action || req.body?.action;
    if (action === 'netflix') {
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
            await supabase
                .from('netflix_tokens')
                .update({ status: 'hangus' })
                .eq('token', token);
            return res.status(200).json({ success: true, code: netflixCode });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem internal.' });
        }
    }
    else if (action === 'config') {
        return res.status(200).json({
            gasUrl: process.env.GAS_URL
        });
    }
    else if (action === 'ripper') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        try {
            const RIPPER_CSV_URL = process.env.RIPPER_CSV_URL;
            if (!RIPPER_CSV_URL) {
                return res.status(500).json({ error: 'Link CSV Ripper belum diatur di Vercel' });
            }
            const response = await fetch(RIPPER_CSV_URL);
            if (!response.ok) {
                throw new Error('Gagal mengambil data Ripper dari Google Sheets');
            }
            const csvText = await response.text();
            const parsedData = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
            });
            return res.status(200).json(parsedData.data);
        } catch (error) {
            console.error("Error API Ripper:", error);
            return res.status(500).json({ error: 'Gagal memuat database ripper' });
        }
    }
    else if (action === 'videos') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=10');
        try {
            const CSV_URL = process.env.GOOGLE_SHEET_CSV_URL;
            if (!CSV_URL) {
                return res.status(500).json({ error: 'Link CSV belum diatur di Vercel' });
            }
            const response = await fetch(CSV_URL);
            if (!response.ok) {
                throw new Error('Gagal mengambil data dari Google Sheets');
            }
            const csvText = await response.text();
            if (csvText.trim().toLowerCase().startsWith('<!doctype') || csvText.trim().toLowerCase().startsWith('<html')) {
                throw new Error('Link CSV salah atau Google Sheet belum di-Publish ke Web (Format CSV).');
            }
            const parsedData = Papa.parse(csvText, {
                header: true, 
                skipEmptyLines: true,
            });
            const formattedData = parsedData.data.map(row => {
                return {
                    id: row.ID_Video || row.id || '',
                    video_url: row.URL_Video || row.video_url || '',
                    caption: row.Caption || row.caption || '',
                    nickname: row.Nickname || row.nickname || 'Player',
                    avatar_url: row.Avatar_URL || row.avatar_url || '',
                    user_id: row.User_ID || row.user_id || ''
                };
            });
            const limit = parseInt(req.query.limit) || formattedData.length;
            const offset = parseInt(req.query.offset) || 0;
            const reversedData = formattedData.reverse();
            const paginatedData = reversedData.slice(offset, offset + limit);
            return res.status(200).json(paginatedData);
        } catch (error) {
            console.error("Error API Get Videos:", error);
            return res.status(500).json({ error: error.message || 'Gagal memuat daftar video' });
        }
    }
    else {
        return res.status(400).json({ success: false, message: 'Parameter action tidak ditemukan atau tidak valid.' });
    }
}
