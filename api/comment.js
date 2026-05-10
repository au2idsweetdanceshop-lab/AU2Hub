export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (req.method === 'GET') {
    const video_id = req.query.video_id;
    // Mengambil semua komentar, diurutkan dari yang paling lama ke baru agar balasan ada di bawah
    const response = await fetch(`${SUPABASE_URL}/rest/v1/comments?video_id=eq.${video_id}&order=created_at.asc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { video_id, nickname, message, parent_id } = req.body;
    
    // Siapkan data yang mau dikirim
    const payload = { video_id, nickname, message };
    // Kalau ada parent_id (berarti ini balasan), tambahkan ke data
    if (parent_id) {
        payload.parent_id = parent_id;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(payload)
    });
    return res.status(200).json({ success: true });
  }
}
