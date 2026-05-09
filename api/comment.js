export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  // JIKA ADA YANG MENGIRIM KOMENTAR
  if (req.method === 'POST') {
    const { video_id, nickname, message } = req.body;
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ video_id, nickname, message })
    });

    if (!response.ok) return res.status(500).json({ error: 'Gagal mengirim komentar' });
    return res.status(200).json({ success: true });
  } 
  
  // JIKA ADA YANG INGIN MELIHAT KOMENTAR
  if (req.method === 'GET') {
    const video_id = req.query.video_id;
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/comments?video_id=eq.${video_id}&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    const data = await response.json();
    return res.status(200).json(data);
  }
}
