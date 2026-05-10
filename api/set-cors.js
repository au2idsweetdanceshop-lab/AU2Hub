import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  try {
    // Ambil nama bucket dan hapus spasi jika ada
    const bucketName = (process.env.BIZNET_BUCKET_NAME || "").trim();
    
    if (!bucketName) {
      return res.status(200).send("❌ ERROR: Nama Bucket belum diisi di Vercel!");
    }

    const client = new S3Client({
      region: "id-jkt-1", // Pakai region Jakarta
      endpoint: "https://neo.s3.biznetgio.com",
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
          },
        ],
      },
    });

    await client.send(command);
    res.status(200).send("✅ BERHASIL! Izin Biznet sudah dibuka. Silakan tes upload di web sekarang!");

  } catch (err) {
    // Kita kirim errornya sebagai teks biasa supaya tidak muncul halaman 500 Vercel
    res.status(200).send("❌ GAGAL: " + err.message);
  }
}
