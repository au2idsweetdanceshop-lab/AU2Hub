const Papa = require('papaparse');
module.exports = async function handler(req, res) {
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
        res.status(200).json(paginatedData);
    } catch (error) {
        console.error("Error API Get Videos:", error);
        res.status(500).json({ error: error.message || 'Gagal memuat daftar video' });
    }
}
