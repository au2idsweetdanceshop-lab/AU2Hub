export default async function handler(req, res) {
  const { file_id } = req.query;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  try {
    // 1. Dapatkan path file asli dari Telegram
    const getPath = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${file_id}`);
    const pathData = await getPath.json();
    
    if (!pathData.ok) return res.status(404).send("File not found");

    const filePath = pathData.result.file_path;
    const videoUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 2. Arahkan browser langsung ke URL file Telegram
    res.redirect(videoUrl);
  } catch (err) {
    res.status(500).send("Streaming Error");
  }
}
