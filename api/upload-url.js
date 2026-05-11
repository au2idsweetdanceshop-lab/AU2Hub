import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
    const { filename, filetype } = req.query;
    const bucketName = process.env.BIZNET_BUCKET_NAME;

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
        const uniqueFileName = `${Date.now()}-${filename.replace(/\s+/g, '-')}`;
        
        // 1. TAMBAHKAN ACL PUBLIC-READ DI SINI
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: `videos/${uniqueFileName}`,
            ContentType: filetype,
            ACL: "public-read" 
        });

        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

        // 2. SESUAIKAN FORMAT URL AGAR SAMA DENGAN SCREENSHOT SPREADSHEET ANDA
        res.status(200).json({
            uploadUrl: uploadUrl,
            finalVideoUrl: `https://${bucketName}.nos.wjv-1.neo.id/videos/${uniqueFileName}`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
