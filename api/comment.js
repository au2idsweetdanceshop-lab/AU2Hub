export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (req.method === 'GET') {
    const video_id = req.query.video_id;
    
    // PERBAIKAN 1: Tambahkan "select=*" untuk memastikan created_at & avatar_url terambil
    const url = `${SUPABASE_URL}/rest/v1/comments?select=*&video_id=eq.${video_id}&order=created_at.asc`;
    
    const response = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // PERBAIKAN 2: Tambahkan avatar_url agar foto profil tersimpan di data komentar
    const { video_id, nickname, message, parent_id, avatar_url } = req.body;
    
    const payload = { 
        video_id, 
        nickname, 
        message, 
        avatar_url: avatar_url || "" // Simpan link foto profil si pengirim
    };

    if (parent_id) {
        payload.parent_id = parent_id;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json', 
          'apikey': SUPABASE_KEY, 
          'Authorization': `Bearer ${SUPABASE_KEY}` 
      },
      body: JSON.stringify(payload)
    });

    return res.status(200).json({ success: true });
  }
}
