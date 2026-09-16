import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    // 🔥 TAMBAHKAN INI AGAR VERCEL IKUT MENGIZINKAN HEADER CORS KE BROWSER HP ANDA
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

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
                    AllowedOrigins: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                }]
            },
        });

        await client.send(command);
        return res.status(200).send(`<h1>✅ BIZNET CORS FORCED SUCCESS!</h1>`);
    } catch (error) {
        return res.status(500).send(`<h1>❌ GAGAL: ${error.message}</h1>`);
    }
}
