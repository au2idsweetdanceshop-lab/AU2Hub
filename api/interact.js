import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { type, video_id, user_id, username, comment_text } = body;

  try {
    if (type === 'like') {
      const { data, error } = await supabase
        .from('likes')
        .insert([{ video_id, user_id }]);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (type === 'comment') {
      const { data, error } = await supabase
        .from('comments')
        .insert([{ video_id, user_id, username, comment_text }]);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    res.status(400).json({ error: "Invalid Interaction Type" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
