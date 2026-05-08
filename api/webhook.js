const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // Cek apakah ada pesan masuk dari Telegram
    const message = req.body.message || req.body.channel_post;

    if (message && message.video) {
        const file_id = message.video.file_id;
        const caption = message.caption || "Video terbaru dari AU2Hub";

        // Simpan ke Supabase secara otomatis
        const { error } = await supabase
            .from('videos')
            .insert([{ file_id, caption }]);

        if (!error) {
            return res.status(200).send('Video tersimpan ke database!');
        }
    }
    
    res.status(200).send('OK');
};
