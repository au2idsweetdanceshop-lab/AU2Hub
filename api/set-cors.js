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
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
                    AllowedOrigins: ["*"], // 🔥 Domain spesifik dimasukkan
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                }]
            },
        });

        await client.send(command);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`<h1>✅ BIZNET CORS V2 BERHASIL DIDOBRAK!</h1>`);
    } catch (error) {
        return res.status(500).send(`❌ GAGAL: ${error.message}`);
    }
}
