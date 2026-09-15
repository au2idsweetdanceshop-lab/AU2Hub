import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    try {
        const bucketName = process.env.BIZNET_BUCKET_NAME?.trim();
        const accessKey = process.env.BIZNET_ACCESS_KEY?.trim();
        const secretKey = process.env.BIZNET_SECRET_KEY?.trim();

        if (!bucketName || !accessKey || !secretKey) {
            return res.status(500).send("❌ GAGAL: Kredensial S3 Biznet kosong di Vercel!");
        }

        const client = new S3Client({
            region: "idn",
            endpoint: "https://nos.wjv-1.neo.id",
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
            forcePathStyle: true, // Wajib true untuk mendobrak Biznet
        });

        const command = new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"], // Membuka gembok untuk semua website
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000,
                    }
                ]
            },
        });

        await client.send(command);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1 style="color: #25D366;">✅ MANTAP! BIZNET BERHASIL DIDOBRAK!</h1>
                <p>Pintu CORS Biznet GIO Anda sudah terbuka permanen.</p>
                <p>Silakan tutup halaman ini, buka aplikasi Anda, dan coba upload video sekarang!</p>
            </div>
        `);
    } catch (error) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(500).send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1 style="color: red;">❌ GAGAL MENDOBRAK BIZNET</h1>
                <p>Pesan Error: ${error.message}</p>
            </div>
        `);
    }
}
