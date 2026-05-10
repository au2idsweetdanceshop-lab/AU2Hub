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

    // 1. Teks XML minimalis (Tanpa spasi/baris baru agar MD5 pasti akurat)
    const xmlBody = '<?xml version="1.0" encoding="UTF-8"?><CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><CORSRule><AllowedOrigin>*</AllowedOrigin><AllowedMethod>GET</AllowedMethod><AllowedMethod>PUT</AllowedMethod><AllowedMethod>POST</AllowedMethod><AllowedMethod>HEAD</AllowedMethod><AllowedHeader>*</AllowedHeader><ExposeHeader>ETag</ExposeHeader></CORSRule></CORSConfiguration>';
    
    // 2. Hitung sidik jari (MD5) dari teks XML di atas
    const md5Base64 = createHash("md5").update(xmlBody, "utf8").digest("base64");

    // 3. Buat perintah (isi dikosongkan karena akan kita paksa di middleware)
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {} 
    });

    // 4. TEKNIK INTERSEPSI: Paksa body dan header MD5 tepat sebelum dikirim
    command.middlewareStack.add(
      (next) => async (args) => {
        args.request.body = xmlBody; // Paksa isi suratnya pakai teks XML kita
        args.request.headers["content-md5"] = md5Base64; // Paksa sidik jarinya sesuai teks tsb
        args.request.headers["content-length"] = Buffer.byteLength(xmlBody).toString();
        // Hapus Content-Type bawaan jika ada agar tidak merusak MD5
        delete args.request.headers["content-type"]; 
        return next(args);
      },
      { step: "build", name: "forceMd5Match" }
    );

    await client.send(command);
    res.status(200).send("✅ AKHIRNYA BERHASIL! Pintu Biznet wjv-1 sudah menyerah dan terbuka. Sekarang silakan tes upload di web!");

  } catch (err) {
    res.status(200).send("❌ MASIH GAGAL: " + err.message);
  }
}
