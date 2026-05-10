const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");

// Inisialisasi Supabase (Taruh di luar handler agar bisa re-use)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Hanya menerima POST' });

    try {
        // 1. CEK TOKEN DARI HEADER
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false, error: 'Butuh login!' });

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) return res.status(401).json({ success: false, error: 'Token tidak valid' });

        // 2. VALIDASI INPUT & UKURAN
        const { fileBase64, userId } = req.body;
        
        // Pastikan userId yang dikirim cocok dengan user yang sedang login
        if (userId !== user.id) {
            return res.status(403).json({ success: false, error: 'Dilarang mengubah data orang lain!' });
        }

        // Cek ukuran (Vercel Limit 4.5MB, tapi kita batasi 1MB biar hemat Biznet)
        const sizeInBytes = Buffer.from(fileBase64.substring(fileBase64.indexOf(',') + 1), 'base64').length;
        if (sizeInBytes > 1024 * 1024) {
            return res.status(400).json({ success: false, error: 'Ukuran foto terlalu besar (Maks 1MB)' });
        }

        // --- KONFIGURASI S3 (Sama seperti kode Anda) ---
        const s3 = new S3Client({
            region: "us-east-1",
            endpoint: process.env.BIZNET_ENDPOINT,
            credentials: {
                accessKeyId: process.env.BIZNET_ACCESS_KEY,
                secretAccessKey: process.env.BIZNET_SECRET_KEY,
            },
            forcePathStyle: true
        });

        const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `avatars/${user.id}/${Date.now()}.jpg`; // User folder agar rapi

        await s3.send(new PutObjectCommand({
            Bucket: process.env.BIZNET_BUCKET,
            Key: fileName,
            Body: buffer,
            ContentType: 'image/jpeg',
            ACL: 'public-read'
        }));

        const publicUrl = `${process.env.BIZNET_ENDPOINT}/${process.env.BIZNET_BUCKET}/${fileName}`;
        res.status(200).json({ success: true, url: publicUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}
