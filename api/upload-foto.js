const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

module.exports = async function handler(req, res) {
    // Hanya menerima perintah POST
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    try {
        const { fileBase64, userId } = req.body;

        // 1. Menghubungkan Vercel dengan Biznet Gio
        const s3 = new S3Client({
            region: "us-east-1", // Wajib diisi string standar, biarkan seperti ini
            endpoint: process.env.BIZNET_ENDPOINT,
            credentials: {
                accessKeyId: process.env.BIZNET_ACCESS_KEY,
                secretAccessKey: process.env.BIZNET_SECRET_KEY,
            },
            forcePathStyle: true // Wajib True untuk Biznet NEO
        });

        // 2. Mengubah Foto dari teks Base64 menjadi file asli (Buffer)
        const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `avatars/${userId}_${Date.now()}.jpg`;

        // 3. Mengirim File ke Biznet Gio
        await s3.send(new PutObjectCommand({
            Bucket: process.env.BIZNET_BUCKET,
            Key: fileName,
            Body: buffer,
            ContentType: 'image/jpeg',
            ACL: 'public-read' // Agar foto bisa dilihat oleh pemain lain
        }));

        // 4. Menyusun Link URL Publik dari Biznet
        const publicUrl = `${process.env.BIZNET_ENDPOINT}/${process.env.BIZNET_BUCKET}/${fileName}`;

        // Lapor sukses ke website
        res.status(200).json({ success: true, url: publicUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}
