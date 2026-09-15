import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    try {
        const bucketName = process.env.BIZNET_BUCKET_NAME?.trim();
        const accessKey = process.env.BIZNET_ACCESS_KEY?.trim();
        const secretKey = process.env.BIZNET_SECRET_KEY?.trim();

        if (!bucketName || !accessKey || !secretKey) {
            return res.status(500).json({ error: 'Kredensial S3 Biznet kosong di env Vercel!' });
        }

        const client = new S3Client({
            region: "idn",
            endpoint: "https://nos.wjv-1.neo.id",
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
            forcePathStyle: false,
        });

        // Ini adalah mantra untuk membuka pintu CORS
        const corsRules = {
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"], // Mengizinkan semua website (termasuk au2idsweetdance.com)
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000,
                    },
                ],
            }
        };

        const command = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: corsRules.CORSConfiguration,
        });

        await client.send(command);

        return res.status(200).json({
            success: true,
            message: "MANTAP! Pintu CORS Biznet GIO berhasil dibuka lebar-lebar! Silakan tes upload video di aplikasi web Anda sekarang."
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Gagal membuka CORS: ' + error.message });
    }
}
