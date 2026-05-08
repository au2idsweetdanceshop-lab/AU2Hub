import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const update = req.body;
    
    // Cek apakah ada pesan baru di channel dan apakah itu video
    if (update.channel_post && update.channel_post.video) {
      const video = update.channel_post.video;
      const caption = update.channel_post.caption || "Video Komunitas AU2Hub";

      // Simpan file_id video tersebut ke tabel 'videos' di Supabase
      await supabase.from('videos').insert([{
        file_id: video.file_id,
        caption: caption
      }]);
    }
  }
  // Beri tahu Telegram bahwa pesan sudah diterima
  res.status(200).send('OK');
}
