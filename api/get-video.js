export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  try {
    // Meminta 30 video terbaru dari tabel 'videos' di Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/videos?select=*&order=created_at.desc&limit=30`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Gagal mengambil data dari Supabase');

    // Berhasil, kirim data ke website
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
