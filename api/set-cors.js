import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { createHash } from "crypto";

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

    // Susunan konfigurasi CORS
    const corsConfig = {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"]
        }
      ]
    };

    // TAHAP KRUSIAL: Menghitung MD5 secara manual untuk Biznet Neo
    const xmlBody = `<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">` +
                    `<CORSRule><AllowedOrigin>*</AllowedOrigin><AllowedMethod>GET</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedMethod>POST</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader></CORSRule>` +
                    `</CORSConfiguration>`;
    
    const md5 = createHash("md5").update(xmlBody).digest("base64");

    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: corsConfig,
    });

    // Memaksa SDK mengirimkan header MD5 yang diminta
    command.middlewareStack.add(
      (next) => (args) => {
        args.request.headers["content-md5"] = md5;
        return next(args);
      },
      { step: "build" }
    );

    await client.send(command);
    res.status(200).send("✅ BERHASIL TOTAL! Pintu Biznet wjv-1 sudah dibuka dengan izin MD5. Silakan tes upload!");

  } catch (err) {
    res.status(200).send("❌ GAGAL LAGI: " + err.message);
  }
}
