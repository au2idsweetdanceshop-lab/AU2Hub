import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

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

    try {
        // Ini adalah perintah paksa untuk memasang CORS ke Biznet
        const command = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"],
                        ExposeHeaders: [],
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        });

        await client.send(command);
        
        res.status(200).json({ 
            sukses: true, 
            pesan: `Hore! Pintu CORS untuk bucket '${bucketName}' berhasil dibuka permanen!` 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
