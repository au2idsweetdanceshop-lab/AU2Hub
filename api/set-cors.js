import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  try {
    const bucketName = (process.env.BIZNET_BUCKET_NAME || "").trim();
    const client = new S3Client({
      region: "idn", 
      endpoint: "https://nos.wjv-1.neo.id", 
      credentials: {
        accessKeyId: process.env.BIZNET_ACCESS_KEY,
        secretAccessKey: process.env.BIZNET_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    await client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [{
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"]
        }]
      }
    }));
    res.status(200).send("✅ BERHASIL! Pintu Biznet wjv-1 sudah dibuka. Sekarang silakan tes upload!");
  } catch (err) {
    res.status(200).send("❌ GAGAL: " + err.message);
  }
}
