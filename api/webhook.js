const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // Logging untuk melihat data masuk di Vercel Logs (Opsional)
    console.log("Data masuk dari Telegram:", JSON.stringify(req.body));

    // Menangani data dari Channel Post atau Pesan Bot Langsung
    const message = req.body.channel_post || req.body.message;

    if (message && message.video) {
        const file_id = message.video.file_id;
        const caption = message.caption || "Video Baru AU2Hub";

        // Masukkan data ke tabel 'videos' di Supabase
        const { data, error } = await supabase
            .from('videos')
            .insert([{ file_id, caption }]);

        if (error) {
            console.error('Gagal simpan ke Supabase:', error.message);
            return res.status(500).send(error.message);
        }

        return res.status(200).send('Video Berhasil Disimpan!');
    }

    // Tetap beri respon 200 OK agar Telegram tidak mengirim ulang terus menerus
    res.status(200).send('Bukan kiriman video, diabaikan.');
};
