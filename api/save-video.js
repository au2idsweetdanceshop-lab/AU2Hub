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

        const parsedData = Papa.parse(csvText, {
            header: true, 
            skipEmptyLines: true,
        });

        // 3. TRANSFORMASI DATA (SANGAT PENTING)
        // Mengubah nama kolom berhuruf besar dari Google Sheet menjadi huruf kecil
        // sesuai dengan yang dibutuhkan oleh kode Javascript di Frontend (HTML)
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

        // 4. Mengirimkan hasil JSON yang sudah disinkronkan
        res.status(200).json(formattedData);
        
    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Gagal memuat daftar video' });
    }
}
