import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
    // Mengizinkan DELETE atau POST (beberapa environment frontend lebih suka POST dengan body JSON)
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.setHeader('Allow', ['DELETE', 'POST']);
        return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    try {
        // Ambil URL file dari body request (JSON) atau dari query parameter
        const fileUrl = req.body?.fileUrl || req.query?.fileUrl;

        if (!fileUrl) {
            return res.status(400).json({ success: false, error: "URL file wajib disertakan" });
        }

        const bucketName = process.env.BIZNET_BUCKET_NAME;
        if (!bucketName || !process.env.BIZNET_ACCESS_KEY || !process.env.BIZNET_SECRET_KEY) {
            throw new Error("Konfigurasi S3 belum lengkap di Environment Variables.");
        }

        // =========================================================
        // MESIN PEMOTONG URL: Mengubah Full URL menjadi S3 'Key'
        // =========================================================
        // Style 1 (Virtual-hosted): https://[bucket].nos.wjv-1.neo.id/...
        const baseUrl1 = `https://${bucketName}.nos.wjv-1.neo.id/`;
        // Style 2 (Path-style): https://nos.wjv-1.neo.id/[bucket]/...
        const baseUrl2 = `https://nos.wjv-1.neo.id/${bucketName}/`;

        let key = fileUrl;
        if (fileUrl.startsWith(baseUrl1)) {
            key = fileUrl.replace(baseUrl1, '');
        } else if (fileUrl.startsWith(baseUrl2)) {
            key = fileUrl.replace(baseUrl2, '');
        }

        // Keamanan: Pastikan yang mau dihapus bukan URL kosong/ngawur
        if (!key || key === fileUrl) {
            return res.status(400).json({ success: false, error: "Format URL file tidak dikenali atau bukan dari Biznet GIO" });
        }

        // =========================================================
        // EKSEKUSI HAPUS KE BIZNET GIO
        // =========================================================
        const client = new S3Client({
            region: "idn",
            endpoint: "https://nos.wjv-1.neo.id",
            credentials: {
                accessKeyId: process.env.BIZNET_ACCESS_KEY,
                secretAccessKey: process.env.BIZNET_SECRET_KEY,
            },
            forcePathStyle: true,
        });

        // Pakai decodeURIComponent untuk mencegah error jika nama file ada spasi (%20)
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: decodeURIComponent(key) 
        });

        await client.send(command);

        return res.status(200).json({ success: true, message: "File berhasil diledakkan dari storage." });

    } catch (error) {
        console.error("Error deleting file:", error);
        return res.status(500).json({ success: false, error: "Gagal menghapus file dari server storage." });
    }
}
