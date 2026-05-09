import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // Mengambil video_id dari request
  const video_id = req.body?.video_id || req.query?.video_id;

  if (req.method === 'POST') {
    // Fungsi untuk menambah Like baru
    const { error } = await supabase.from('likes').insert([{ video_id }])
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  } 
  
  if (req.method === 'GET') {
    // Fungsi untuk menghitung total Like
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('video_id', video_id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ count })
  }
}
