import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { filename, filetype } = req.query;

    // Pastikan variabel lingkungan ada (Cek satu-satu)
    if (!process.env.BIZNET_ACCESS_KEY || !process.env.BIZNET_SECRET_KEY || !process.env.BIZNET_BUCKET_NAME) {
        return res.status(500).json({ error: "Variabel BIZNET di Vercel belum lengkap!" });
    }

    if (!filename) return res.status(400).json({ error: "Filename tidak ditemukan" });

    const uniqueFileName = `${Date.now()}-${filename.replace(/\s+/g, '-')}`;

    // Konfigurasi Client S3 Biznet Gio (Lebih kompatibel)
    const client = new S3Client({
        region: "us-east-1", // Coba us-east-1 jika id-jkt-1 error
        endpoint: "https://neo.s3.biznetgio.com",
        credentials: {
            accessKeyId: process.env.BIZNET_ACCESS_KEY,
            secretAccessKey: process.env.BIZNET_SECRET_KEY,
        },
        forcePathStyle: true,
    });

    try {
        const command = new PutObjectCommand({
            Bucket: process.env.BIZNET_BUCKET_NAME,
            Key: `videos/${uniqueFileName}`,
            ContentType: filetype,
            // ACL: 'public-read' // Matikan baris ini sementara jika masih error 500
        });

        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });

        res.status(200).json({
            uploadUrl: uploadUrl,
            finalVideoUrl: `https://neo.s3.biznetgio.com/${process.env.BIZNET_BUCKET_NAME}/videos/${uniqueFileName}`
        });
    } catch (err) {
        // Ini akan mengirim pesan error aslinya ke browser supaya kamu bisa baca
        res.status(500).json({ error: err.message, stack: err.stack });
    }
}
