import { S3Client, PutBucketCorsCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    // Header CORS untuk Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const bucketName = process.env.BIZNET_BUCKET_NAME?.trim();
        const client = new S3Client({
            region: "idn", 
            endpoint: "https://nos.wjv-1.neo.id",
            credentials: { 
                accessKeyId: process.env.BIZNET_ACCESS_KEY?.trim(), 
                secretAccessKey: process.env.BIZNET_SECRET_KEY?.trim() 
            },
            forcePathStyle: true,
        });

        // 🔥 1. EKSEKUSI ATURAN CORS
        const corsCommand = new PutBucketCorsCommand({
            Bucket: bucketName,
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
        await client.send(corsCommand);

        // 🔥 2. EKSEKUSI ATURAN POLICY (PUBLIC READ)
        const policy = {
            Version: "2012-10-17",
            Statement: [{
                Sid: "PublicReadGetObject",
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: `arn:aws:s3:::${bucketName}/*`
            }]
        };
        const policyCommand = new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(policy)
        });
        await client.send(policyCommand);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(`
            <h1 style="color: green;">✅ BIZNET FULL CONFIG SUCCESS!</h1>
            <p>Aturan CORS dan Bucket Policy (Public Read) berhasil diterapkan sekaligus ke server Biznet.</p>
        `);
    } catch (error) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(500).send(`<h1 style="color: red;">❌ GAGAL: ${error.message}</h1>`);
    }
}
