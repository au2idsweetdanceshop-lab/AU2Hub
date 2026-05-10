import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    // 1. Pastikan hanya menerima metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // 2. Ambil data dari web. 
        // Kita dukung nama "userId" atau "user_id" agar tidak ada lagi error "Butuh login!"
        const fileBase64 = req.body.fileBase64;
        const userId = req.body.userId || req.body.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, error: 'Butuh login!' });
        }

        if (!fileBase64) {
            return res.status(400).json({ success: false, error: 'File gambar kosong!' });
        }

        // 3. Ubah teks Base64 menjadi file Gambar (Buffer)
        const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        
        // 4. Siapkan nama file & folder di Biznet
        const fileName = `avatars/${userId}-${Date.now()}.jpg`;
        const bucketName = (process.env.BIZNET_BUCKET_NAME || "").trim();

        // 5. Hubungkan ke Biznet (Menggunakan alamat wjv-1 TERBARU milikmu)
        const client = new S3Client({
            region: "idn",
            endpoint: "https://nos.wjv-1.neo.id",
            credentials: {
                accessKeyId: process.env.BIZNET_ACCESS_KEY,
                secretAccessKey: process.env.BIZNET_SECRET_KEY,
            },
            forcePathStyle: true,
        });

        // 6. Perintah Upload ke Biznet
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: buffer,
            ContentType: "image/jpeg"
        });

        await client.send(command);

        // 7. Buat link foto berhasil dan kirim ke Web
        const fileUrl = `https://nos.wjv-1.neo.id/${bucketName}/${fileName}`;

        res.status(200).json({ success: true, url: fileUrl });
    } catch (error) {
        console.error("Error Upload Foto:", error);
        res.status(500).json({ success: false, error: error.message });
    }
}
