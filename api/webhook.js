const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

module.exports = async (req, res) => {
    // Paksa Vercel untuk tidak melakukan redirect
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'GET') {
        return res.status(200).send('Webhook Aktif & Siap Menerima Video!');
    }

    const update = req.body;
    const message = update.channel_post || update.message;

    if (message && message.video) {
        const { error } = await supabase
            .from('videos')
            .insert([{ 
                file_id: message.video.file_id, 
                caption: message.caption || "Video Baru AU2ID" 
            }]);

        if (error) return res.status(200).send('Gagal simpan tapi tetap OK agar tidak redirect');
        return res.status(200).send('Sukses!');
    }

    return res.status(200).send('OK');
};
