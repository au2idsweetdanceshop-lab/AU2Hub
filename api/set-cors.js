import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    // 1. CEK APAKAH KUNCI TERBACA
    const credentials = {
        accessKeyId: process.env.BIZNET_ACCESS_KEY,
        secretAccessKey: process.env.BIZNET_SECRET_KEY,
    };
    const bucket = process.env.BIZNET_BUCKET_NAME;

    if (!credentials.accessKeyId || !credentials.secretAccessKey || !bucket) {
        return res.status(200).send(`
            ❌ ERROR: Kunci Vercel Belum Lengkap!
            BIZNET_ACCESS_KEY: ${credentials.accessKeyId ? '✅ Ada' : '❌ KOSONG'}
            BIZNET_SECRET_KEY: ${credentials.secretAccessKey ? '✅ Ada' : '❌ KOSONG'}
            BIZNET_BUCKET_NAME: ${bucket ? '✅ Ada' : '❌ KOSONG'}
            
            Solusi: Cek lagi tab Settings > Environment Variables di Vercel!
        `);
    }

    const client = new S3Client({
        region: "us-east-1", // Biznet biasanya pakai us-east-1 untuk S3-Compat
        endpoint: "https://neo.s3.biznetgio.com",
        credentials,
        forcePathStyle: true,
    });

    const corsParams = {
        Bucket: bucket,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedOrigins: ["*"],
                    AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
                    AllowedHeaders: ["*"],
                    ExposeHeaders: ["ETag"]
                }
            ]
        }
    };

    try {
        await client.send(new PutBucketCorsCommand(corsParams));
        res.status(200).send("✅ BERHASIL TOTAL! Pintu Biznet sudah dibuka. Silakan tes upload di web sekarang.");
    } catch (err) {
        // TAMPILKAN ERROR ASLI DARI BIZNET
        res.status(200).send(`
            ❌ BIZNET MENOLAK:
            Pesan: ${err.message}
            Kode: ${err.name}
        `);
    }
}
