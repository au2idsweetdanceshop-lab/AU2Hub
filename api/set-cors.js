import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    try {
        const client = new S3Client({
            region: "us-east-1", // 🔥 WAJIB disamakan dengan upload-url.js
            endpoint: "https://nos.wjv-1.neo.id",
            credentials: { 
                accessKeyId: process.env.BIZNET_ACCESS_KEY?.trim(), 
                secretAccessKey: process.env.BIZNET_SECRET_KEY?.trim() 
            },
            forcePathStyle: true,
        });

        const command = new PutBucketCorsCommand({
            Bucket: process.env.BIZNET_BUCKET_NAME?.trim(),
            CORSConfiguration: {
                CORSRules: [{
                    // 🔥 Buka semua izin Header (Penting untuk Content-Type)
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
                    // 🔥 JANGAN DIGABUNG. Gunakan HANYA "*" agar PWA/WebView Android bisa masuk
                    AllowedOrigins: ["*"], 
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                }]
            },
        });

        await client.send(command);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
            <h1 style="color: green;">✅ BIZNET CORS V3 BERHASIL DIDOBRAK!</h1>
            <p>Aturan Origin telah di-set ke * (Bebas dari PWA/WebView mana pun).</p>
        `);
    } catch (error) {
        return res.status(500).send(`<h1 style="color: red;">❌ GAGAL: ${error.message}</h1>`);
    }
}
