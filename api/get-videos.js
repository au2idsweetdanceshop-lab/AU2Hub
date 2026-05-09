const Papa = require('papaparse');

module.exports = async function handler(req, res) {
    // 1. Memberikan izin akses (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 2. TAMBAHKAN BARIS INI (Benteng Pertahanan untuk 2000 user)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    
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

        // 3. Mengirimkan hasil JSON
        res.status(200).json(parsedData.data);
    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Gagal memuat daftar video' });
    }
}
