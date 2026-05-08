// File: api/stream-video.js

export default async function handler(req, res) {
    const { file_id } = req.query;
    
    // Validasi: Cek apakah file_id dikirim oleh website
    if (!file_id) {
        return res.status(400).json({ error: "Parameter file_id tidak ditemukan" });
    }
    
    // Pastikan kamu sudah menaruh Token Bot kamu di Environment Variables Vercel
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; 

    try {
        // 1. Minta lokasi file (file_path) ke server Telegram
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${file_id}`);
        const data = await response.json();

        if (data.ok) {
            const filePath = data.result.file_path;
            
            // 2. Buat link asli untuk mendownload video dari Telegram
            const videoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

            // 3. Trik Rahasia: Alihkan (redirect) pemutar video di website untuk mengambil dari link ini
            res.redirect(302, videoUrl);
        } else {
            // Error dari Telegram (misal: file_id salah atau file dihapus)
            res.status(404).json({ error: "Video tidak ditemukan di Telegram", detail: data.description });
        }
    } catch (error) {
        res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
}
