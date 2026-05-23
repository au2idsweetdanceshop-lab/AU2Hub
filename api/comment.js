export default async function handler(req, res) {
  // 1. FALLBACK ANTI CRASH
  // Jika ENV di Vercel kosong, API otomatis mengambil URL & Key dari hardcode ini
  const SUPABASE_URL = process.env.SUPABASE_URL || "https://divckiqkodtqudcoxkjz.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpdmNraXFrb2R0cXVkY294a2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDY0MzIsImV4cCI6MjA5MzkyMjQzMn0.z_FIS_rpDQPQ7nNWpuvabH7qDYgu7uq6TlYj9LSOcJQ";

  if (req.method === 'GET') {
    try {
        const video_id = req.query.video_id;
        const url = `${SUPABASE_URL}/rest/v1/comments?select=*&video_id=eq.${video_id}&order=created_at.desc`;
        
        const response = await fetch(url, {
          headers: { 
            'apikey': SUPABASE_KEY, 
            'Authorization': `Bearer ${SUPABASE_KEY}` 
          }
        });
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
        // 2. TANGKAP user_id DARI FRONTEND
        const { video_id, nickname, message, parent_id, avatar_url, user_id } = req.body;
        
        // 3. MASUKKAN user_id KE PAYLOAD
        const payload = { 
            video_id, 
            nickname, 
            message,
            avatar_url: avatar_url || "",
            user_id: user_id || null 
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

        // 4. PENANGKAP ERROR DARI SUPABASE (Biar Vercel tidak crash)
        if (!response.ok) {
            const errorText = await response.text();
            try {
                const err = JSON.parse(errorText);
                return res.status(400).json({ success: false, error: err.message || err });
            } catch(e) {
                return res.status(400).json({ success: false, error: errorText });
            }
        }

        return res.status(200).json({ success: true });
        
    } catch (error) {
        // 5. PENANGKAP ERROR JAVASCRIPT
        // Jika ada bug, Vercel akan mengirim JSON ini, BUKAN memunculkan "FUNCTION_INVOCATION_FAILED"
        return res.status(500).json({ success: false, error: "Server Error API: " + error.message });
    }
  }

  // Jika diakses tidak menggunakan GET atau POST
  return res.status(405).json({ error: "Method not allowed" });
}
