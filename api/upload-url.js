import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
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

    // JALUR 1: Jika frontend mengirim file rekaman langsung (POST) - ANTI CORS
    if (req.method === 'POST') {
        try {
            const { fileBase64, filetype } = req.body;
            if (!fileBase64) return res.status(400).json({ error: 'Tidak ada data file' });

            const buffer = Buffer.from(fileBase64, 'base64');
            const uniqueFileName = `vn_${Date.now()}.webm`;

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: `videos/${uniqueFileName}`,
                Body: buffer,
                ContentType: filetype || 'audio/webm'
            });

            await client.send(command);
            return res.status(200).json({
                success: true,
                url: `https://${bucketName}.nos.wjv-1.neo.id/videos/${uniqueFileName}`
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // JALUR 2: Jika frontend meminta pre-signed url untuk video feed biasa (GET)
    const { filename, filetype } = req.query;
    try {
        const uniqueFileName = `${Date.now()}-${filename.replace(/\s+/g, '-')}`;
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: `videos/${uniqueFileName}`,
            ContentType: filetype
        });

        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
        return res.status(200).json({
            uploadUrl: uploadUrl,
            finalVideoUrl: `https://${bucketName}.nos.wjv-1.neo.id/videos/${uniqueFileName}`
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
