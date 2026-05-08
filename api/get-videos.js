const { createClient } = require('@supabase/supabase-js');

// Pastikan nama di bawah ini sama persis dengan yang ada di Environment Variables Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    try {
        const { data, error } = await supabase
            .from('videos')
            .select('*');

        if (error) throw error;

        // Acak video agar FYP selalu baru
        const shuffledVideos = data.sort(() => 0.5 - Math.random());

        res.status(200).json(shuffledVideos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
