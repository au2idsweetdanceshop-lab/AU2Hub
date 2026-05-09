export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  try {
    const video_id = req.body?.video_id || req.query?.video_id;

    if (req.method === 'POST') {
      const { nickname, message } = req.body;
      const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({ video_id, nickname, message })
      });
      if (!response.ok) throw new Error('Gagal kirim komen');
      return res.status(200).json({ success: true });
    }

    if (req.method === 'GET') {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/comments?video_id=eq.${video_id}&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await response.json();
      return res.status(200).json(data);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
