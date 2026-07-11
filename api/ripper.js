const Papa = require('papaparse');
module.exports = async function handler(req, res) {
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
        res.status(200).json(parsedData.data);
    } catch (error) {
        console.error("Error API Ripper:", error);
        res.status(500).json({ error: 'Gagal memuat database ripper' });
    }
}
