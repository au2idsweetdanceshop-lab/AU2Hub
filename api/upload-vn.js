import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Atur batas ukuran file agar cukup untuk Voice Note
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { fileBase64, filetype } = req.body;
    const bucketName = process.env.BIZNET_BUCKET_NAME;

    if (!fileBase64) return res.status(400).json({ error: 'Tidak ada data file suara' });

    // Ubah data Base64 kembali menjadi file Audio
    const buffer = Buffer.from(fileBase64, 'base64');
    const uniqueFileName = `vn_${Date.now()}.webm`;

    const client = new S3Client({
        region: "idn", 
        endpoint: "https://nos.wjv-1.neo.id", 
        credentials: {
            accessKeyId: process.env.BIZNET_ACCESS_KEY,
            secretAccessKey: process.env.BIZNET_SECRET_KEY,
        },
        forcePathStyle: true,
    });

    try {
        // Upload langsung antar Server (Bypass CORS)
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: `videos/${uniqueFileName}`,
            Body: buffer,
            ContentType: filetype || 'audio/webm'
        });

        await client.send(command);

        res.status(200).json({
            success: true,
            url: `https://${bucketName}.nos.wjv-1.neo.id/videos/${uniqueFileName}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
