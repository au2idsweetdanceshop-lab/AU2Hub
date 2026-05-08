import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  try {
    // Ambil 30 video terbaru dari Supabase
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    // Acak urutan video ala TikTok
    const shuffled = data.sort(() => Math.random() - 0.5);
    res.status(200).json(shuffled);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
