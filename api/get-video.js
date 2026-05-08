export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  try {
    // Mengambil 50 pesan terbaru dari channel
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getChatHistory?chat_id=${channelId}&limit=50`
    );
    const data = await response.json();

    if (!data.ok) return res.status(500).json({ error: "Telegram API Error" });

    // Filter pesan yang mengandung video
    const videos = data.result
      .filter(msg => msg.video)
      .map(msg => ({
        id: msg.message_id.toString(),
        file_id: msg.video.file_id,
        caption: msg.caption || "AU2Hub Community Video",
        date: msg.date
      }));

    // ACAK VIDEO (Randomize)
    const shuffled = videos.sort(() => Math.random() - 0.5);

    res.status(200).json(shuffled);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
