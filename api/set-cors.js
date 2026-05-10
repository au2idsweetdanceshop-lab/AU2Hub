import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    const client = new S3Client({
        region: "us-east-1",
        endpoint: "https://neo.s3.biznetgio.com",
        credentials: {
            accessKeyId: process.env.BIZNET_ACCESS_KEY,
            secretAccessKey: process.env.BIZNET_SECRET_KEY,
        },
        forcePathStyle: true,
    });

    const corsParams = {
        Bucket: process.env.BIZNET_BUCKET_NAME,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedOrigins: ["*"],
                    AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
                    AllowedHeaders: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000
                }
            ]
        }
    };

    try {
        await client.send(new PutBucketCorsCommand(corsParams));
        res.status(200).send("✅ BERHASIL! Izin CORS Biznet sudah terbuka. Sekarang kamu bisa tes upload video di web!");
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
