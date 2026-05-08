export default async function handler(req, res) {
  if (req.method === 'POST') {
    const update = req.body;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    // Tangkap dari Channel ATAUPUN dari Chat/Grup Biasa
    const msg = update.channel_post || update.message;

    // Cek apakah ada pesan dan apakah itu adalah Video
    if (msg && msg.video) {
      const video = msg.video;
      const caption = msg.caption || "Video Komunitas AU2Hub";

      // Simpan paksa ke Supabase
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
  
  res.status(200).send('OK');
}
