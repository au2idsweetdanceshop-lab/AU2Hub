export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (req.method === 'GET') {
    const video_id = req.query.video_id;

    // --- PERBAIKAN DI SINI ---
    // 1. Menambahkan select=* (supaya created_at dan kolom lain terambil)
    // 2. Mengubah order=created_at.desc (supaya komentar terbaru muncul di atas)
    const url = `${SUPABASE_URL}/rest/v1/comments?select=*&video_id=eq.${video_id}&order=created_at.desc`;
    
    const response = await fetch(url, {
      headers: { 
        'apikey': SUPABASE_KEY, 
        'Authorization': `Bearer ${SUPABASE_KEY}` 
      }
    });
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // Pastikan mengambil avatar_url dari body agar foto profil masuk ke database
    const { video_id, nickname, message, parent_id, avatar_url } = req.body;
    
    const payload = { 
        video_id, 
        nickname, 
        message,
        avatar_url: avatar_url || "" // Tambahkan foto profil si pengirim
    };

    if (parent_id) {
        payload.parent_id = parent_id;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'apikey': SUPABASE_KEY, 
        'Authorization': `Bearer ${SUPABASE_KEY}` 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.json();
        return res.status(400).json({ success: false, error: err.message });
    }

    return res.status(200).json({ success: true });
  }
}
