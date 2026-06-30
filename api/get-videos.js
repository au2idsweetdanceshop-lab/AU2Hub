const Papa = require('papaparse');

module.exports = async function handler(req, res) {
    // 1. Memberikan izin akses (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 2. CACHE CONTROL (Diperbarui)
    // s-maxage=2 berarti cache disimpan 2 detik di server Vercel (cukup kuat untuk menahan ribuan user)
    // stale-while-revalidate=10 berarti mengambil data baru di latar belakang agar terasa real-time
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

        // 🔥 JARING PENGAMAN ANTI-CRASH (Mencegah Error <!DOCTYPE html>)
        // Jika link Sheets salah dan malah mengembalikan halaman web biasa, hentikan proses!
        if (csvText.trim().toLowerCase().startsWith('<!doctype') || csvText.trim().toLowerCase().startsWith('<html')) {
            throw new Error('Link CSV salah atau Google Sheet belum di-Publish ke Web (Format CSV).');
        }

        const parsedData = Papa.parse(csvText, {
            header: true, 
            skipEmptyLines: true,
        });

        // 3. TRANSFORMASI DATA
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

        // 🔥 4. LOGIKA PAGINATION (SINKRON DENGAN APP.JS BARU) 🔥
        // Menangkap perintah ?limit=20&offset=0 dari Frontend
        const limit = parseInt(req.query.limit) || formattedData.length;
        const offset = parseInt(req.query.offset) || 0;

        // Balikkan urutan agar video terbaru (paling bawah di Spreadsheet) muncul duluan
        const reversedData = formattedData.reverse();

        // Potong array sesuai dengan antrean yang diminta aplikasi
        const paginatedData = reversedData.slice(offset, offset + limit);

        // 5. Mengirimkan hasil JSON yang sudah dipotong
        res.status(200).json(paginatedData);
        
    } catch (error) {
        console.error("Error API Get Videos:", error);
        res.status(500).json({ error: error.message || 'Gagal memuat daftar video' });
    }
}
