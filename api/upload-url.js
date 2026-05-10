import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { filename, filetype } = req.query;
    const uniqueFileName = `${Date.now()}-${filename.replace(/\s+/g, '-')}`;

    // Konfigurasi Client S3 Biznet Gio
    const client = new S3Client({
        region: "id-jkt-1", // Sesuaikan region Biznet kamu
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
            ACL: 'public-read'
        });

        // Membuat URL Izin Upload (Berlaku 60 detik)
        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 60 });

        res.status(200).json({
            uploadUrl: uploadUrl,
            finalVideoUrl: `https://neo.s3.biznetgio.com/${process.env.BIZNET_BUCKET_NAME}/videos/${uniqueFileName}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
