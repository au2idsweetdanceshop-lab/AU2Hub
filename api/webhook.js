export default async function handler(req, res) {
  if (req.method === 'POST') {
    const update = req.body;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    // Cek apakah ada pesan baru di channel dan apakah itu adalah Video
    if (update.channel_post && update.channel_post.video) {
      const video = update.channel_post.video;
      const caption = update.channel_post.caption || "Video Komunitas AU2Hub";

      // Simpan file_id dan caption ke tabel 'videos' di Supabase
      await fetch(`${supabaseUrl}/rest/v1/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          file_id: video.file_id,
          caption: caption
        })
      });
    }
  }
  
  // Wajib merespon 200 OK agar Telegram tahu pesan sudah diterima
  res.status(200).send('OK');
}
