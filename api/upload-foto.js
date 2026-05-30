import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Menaikkan batas ukuran payload agar file base64 tidak terkena limit (Error 413 Payload Too Large)
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
    // Hanya izinkan method POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, error: `Method ${req.method} tidak diizinkan` });
    }

    try {
        const fileBase64 = req.body.fileBase64;
        const userId = req.body.userId || req.body.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Butuh ID Pengguna (Belum login)!' });
        }

        if (!fileBase64) {
            return res.status(400).json({ success: false, error: 'File gambar kosong!' });
        }

        // Mengubah teks Base64 menjadi file Buffer Gambar
        const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Format penamaan file di dalam sub-folder user agar rapi
        const fileName = `avatars/${userId}/foto_${Date.now()}.jpg`;
        const bucketName = (process.env.BIZNET_BUCKET_NAME || "").trim();

        // Validasi environment variables untuk menghindari crash internal
        if (!bucketName || !process.env.BIZNET_ACCESS_KEY || !process.env.BIZNET_SECRET_KEY) {
            throw new Error("Konfigurasi S3/Biznet belum lengkap di Environment Variables.");
        }

        const client = new S3Client({
            region: "idn",
            endpoint: "https://nos.wjv-1.neo.id",
            credentials: {
                accessKeyId: process.env.BIZNET_ACCESS_KEY,
                secretAccessKey: process.env.BIZNET_SECRET_KEY,
            },
            forcePathStyle: true,
        });

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: "image/jpeg",
            ACL: "public-read" // KUNCI AGAR FOTO TIDAK BROKEN DI FRONTEND
        });

        await client.send(command);

        // Format URL diseragamkan dengan upload-url.js (Virtual-hosted style)
        const fileUrl = `https://${bucketName}.nos.wjv-1.neo.id/${fileName}`;

        return res.status(200).json({ success: true, url: fileUrl });
    } catch (error) {
        console.error("Error Upload Foto:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
