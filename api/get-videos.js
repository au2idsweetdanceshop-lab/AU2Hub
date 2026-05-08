import { createClient } from '@supabase/supabase-js';

// Mengambil kunci rahasia dari pengaturan Vercel (Environment Variables)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Pastikan API hanya bisa diakses dengan metode GET
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 1. Ambil semua data video dari tabel 'videos' di Supabase
        const { data, error } = await supabase
            .from('videos')
            .select('*');

        if (error) throw error;

        // 2. ACAK VIDEO (Randomizer)
        // Fungsi ini akan mengocok urutan video setiap kali halaman direfresh
        const shuffledVideos = data.sort(() => 0.5 - Math.random());

        // 3. Kirim data yang sudah diacak ke Frontend (HTML)
        res.status(200).json(shuffledVideos);

    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Gagal mengambil data video dari database' });
    }
}
