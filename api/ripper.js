const Papa = require('papaparse');

module.exports = async function handler(req, res) {
    // 1. Memberikan izin akses (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 2. TAMBAHKAN BARIS INI (Pelindung agar tidak kena blokir Google)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    
    try {
        // Mengambil link CSV dari Environment Variables Vercel
        const RIPPER_CSV_URL = process.env.RIPPER_CSV_URL;

        if (!RIPPER_CSV_URL) {
            return res.status(500).json({ error: 'Link CSV Ripper belum diatur di Vercel' });
        }

        const response = await fetch(RIPPER_CSV_URL);
        
        if (!response.ok) {
            throw new Error('Gagal mengambil data Ripper dari Google Sheets');
        }
        
        const csvText = await response.text();

        // Mengubah teks CSV menjadi format JSON
        const parsedData = Papa.parse(csvText, {
            header: true, // Akan otomatis membaca baris pertama sebagai nama kolom
            skipEmptyLines: true,
        });

        // Mengirimkan data ke website
        res.status(200).json(parsedData.data);
    } catch (error) {
        console.error("Error API Ripper:", error);
        res.status(500).json({ error: 'Gagal memuat database ripper' });
    }
}
