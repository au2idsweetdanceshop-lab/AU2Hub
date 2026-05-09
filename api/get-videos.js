export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Mengambil URL rahasia dari Environment Variables Vercel
        const SHEETDB_VIDEO_URL = process.env.SECRET_SHEETDB_VIDEO_URL;

        const response = await fetch(SHEETDB_VIDEO_URL);
        
        if (!response.ok) {
            throw new Error('Gagal mengambil data video dari SheetDB');
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Error API Video:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
}
