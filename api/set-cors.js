import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  try {
    const bucketName = (process.env.BIZNET_BUCKET_NAME || "").trim();
    if (!bucketName) return res.status(200).send("❌ ERROR: Nama Bucket kosong!");

    const client = new S3Client({
      region: "idn", // Sesuai foto kamu
      endpoint: "https://nos.wjv-1.neo.id", // Sesuai foto kamu (Primary)
      credentials: {
        accessKeyId: process.env.BIZNET_ACCESS_KEY,
        secretAccessKey: process.env.BIZNET_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"]
          },
        ],
      },
    });

    await client.send(command);
    res.status(200).send("✅ BERHASIL TOTAL! Alamat asli sudah terhubung. Sekarang pintu Biznet sudah terbuka!");

  } catch (err) {
    res.status(200).send("❌ GAGAL: " + err.message);
  }
}
