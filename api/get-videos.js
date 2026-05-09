import Papa from 'papaparse';

export default async function handler(req, res) {
    // Memberikan izin akses (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        // Mengambil link CSV dari Environment Variables Vercel
        const CSV_URL = process.env.GOOGLE_SHEET_CSV_URL;

        if (!CSV_URL) {
            return res.status(500).json({ error: 'Link CSV belum diatur di Vercel' });
        }

        const response = await fetch(CSV_URL);
        const csvText = await response.text();

        // Mengubah teks CSV menjadi JSON secara otomatis
        const parsedData = Papa.parse(csvText, {
            header: true, // Baris pertama dianggap sebagai nama kolom (id, video_url, dll)
            skipEmptyLines: true,
        });

        // Mengirimkan data video ke website kamu
        res.status(200).json(parsedData.data);
    } catch (error) {
        console.error("Error mengambil CSV:", error);
        res.status(500).json({ error: 'Gagal memuat daftar video' });
    }
}
