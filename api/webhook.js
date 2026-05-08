const { createClient } = require('@supabase/supabase-js');

// Pastikan Environment Variables di Vercel sudah benar: SUPABASE_URL & SUPABASE_ANON_KEY
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
    // Memberi tahu Vercel bahwa ini adalah request masuk
    if (req.method !== 'POST') {
        return res.status(200).send('Webhook aktif! Kirimkan POST request dari Telegram.');
    }

    try {
        // Menangkap data dari Telegram (Channel atau Pesan Langsung)
        const update = req.body;
        const message = update.channel_post || update.message;

        if (message && message.video) {
            const file_id = message.video.file_id;
            const caption = message.caption || "Video Baru AU2ID";

            // Simpan ke Supabase
            const { error } = await supabase
                .from('videos')
                .insert([{ file_id: file_id, caption: caption }]);

            if (error) {
                console.error('Supabase Error:', error.message);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).send('Video tersimpan otomatis!');
        }

        return res.status(200).send('OK, tapi bukan video.');
    } catch (err) {
        console.error('System Error:', err.message);
        return res.status(500).send('Terjadi kesalahan internal.');
    }
};
