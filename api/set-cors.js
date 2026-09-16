import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    try {
        const client = new S3Client({
            region: "idn", 
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
                    // 🔥 Kita sebutkan headernya satu per satu, jangan pakai "*"
                    AllowedHeaders: ["Content-Type", "Authorization", "X-Amz-Date", "X-Amz-Security-Token", "X-Amz-User-Agent", "X-Amz-Content-Sha256"],
                    AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
                    // 🔥 Kita tembak domain spesifik, hilangkan "*"
                    AllowedOrigins: [
                        "https://au2idsweetdance.com", 
                        "https://www.au2idsweetdance.com", 
                        "http://localhost:3000"
                    ], 
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                }]
            },
        });

        await client.send(command);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
            <h1 style="color: green;">✅ BIZNET CORS FINAL BERHASIL!</h1>
            <p>Aturan Origin spesifik telah ditanam ke bucket Biznet.</p>
        `);
    } catch (error) {
        return res.status(500).send(`<h1 style="color: red;">❌ GAGAL: ${error.message}</h1>`);
    }
}
