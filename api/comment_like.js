export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (req.method === 'GET') {
    const comment_id = req.query.comment_id;
    const response = await fetch(`${SUPABASE_URL}/rest/v1/comment_likes?comment_id=eq.${comment_id}&select=id`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await response.json();
    return res.status(200).json({ count: data.length });
  }

  if (req.method === 'POST') {
    const { comment_id } = req.body;
    await fetch(`${SUPABASE_URL}/rest/v1/comment_likes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ comment_id })
    });
    return res.status(200).json({ success: true });
  }
}
