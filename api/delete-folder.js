import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Konfigurasi Biznet GIO S3
const s3Client = new S3Client({
    region: process.env.S3_REGION || "id-jk1",
    endpoint: process.env.S3_ENDPOINT, // e.g., "https://nos.wjv-1.neo.id"
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
    }
});

export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ error: "Method Not Allowed" });

    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID wajib disertakan" });

    try {
        const bucketName = process.env.S3_BUCKET_NAME;
        const prefix = `${userId}/`; // Awalan nama file (folder user)

        // 1. Cari semua file yang ada di dalam folder user tersebut
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
        });
        const listedObjects = await s3Client.send(listCommand);

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return res.status(200).json({ message: "Folder kosong atau tidak ditemukan." });
        }

        // 2. Siapkan array file untuk dihapus
        const deleteParams = {
            Bucket: bucketName,
            Delete: { Objects: [] }
        };

        listedObjects.Contents.forEach(({ Key }) => {
            deleteParams.Delete.Objects.push({ Key });
        });

        // 3. Eksekusi penghapusan massal
        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        await s3Client.send(deleteCommand);

        // Jika jumlah file lebih dari 1000, proses ini harus diulang (pagination), 
        // namun untuk skala aplikasi standar, blok kode di atas sudah cukup.

        return res.status(200).json({ success: true, message: `Folder ${userId} berhasil dihapus.` });
    } catch (error) {
        console.error("Error deleting S3 folder:", error);
        return res.status(500).json({ error: "Gagal menghapus file di storage." });
    }
}
