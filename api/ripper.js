export default async function handler(req, res) {
    // Hanya izinkan metode GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Mengambil URL rahasia dari Environment Variables Vercel
        const SHEETDB_URL = process.env.SECRET_SHEETDB_URL;

        // Vercel yang melakukan request ke SheetDB (tidak terlihat oleh user)
        const response = await fetch(SHEETDB_URL);
        
        if (!response.ok) {
            throw new Error('Gagal mengambil data dari SheetDB');
        }

        const data = await response.json();

        // Mengirimkan hasil data tersebut ke frontend website kamu
        res.status(200).json(data);
    } catch (error) {
        console.error("Error API:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server' });
    }
}
