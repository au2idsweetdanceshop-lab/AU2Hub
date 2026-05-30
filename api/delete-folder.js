import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Konfigurasi Biznet GIO S3 diseragamkan dengan upload-url.js & upload-foto.js
const s3Client = new S3Client({
    region: "idn",
    endpoint: "https://nos.wjv-1.neo.id",
    credentials: {
        accessKeyId: process.env.BIZNET_ACCESS_KEY,
        secretAccessKey: process.env.BIZNET_SECRET_KEY,
    },
    forcePathStyle: true, // KUNCI PENTING untuk Biznet NEO
});

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "User ID wajib disertakan" });

    try {
        const bucketName = process.env.BIZNET_BUCKET_NAME;
        
        // Daftar prefix (folder) yang harus dibasmi tuntas untuk user ini
        const foldersToDelete = [
            `${userId}/`,          // Berisi: feed_video, chat_media, story_media, pasar
            `avatars/${userId}/`   // Berisi: foto profil (Sesuai dengan upload-foto.js)
        ];

        // Looping untuk setiap folder
        for (const prefix of foldersToDelete) {
            let isTruncated = true;
            let continuationToken = undefined;

            // SISTEM PAGINATION: Lakukan perulangan jika file user lebih dari 1000
            while (isTruncated) {
                const listCommand = new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: prefix,
                    ContinuationToken: continuationToken
                });
                const listedObjects = await s3Client.send(listCommand);

                // Jika ada isinya, eksekusi hapus
                if (listedObjects.Contents && listedObjects.Contents.length > 0) {
                    const deleteParams = {
                        Bucket: bucketName,
                        Delete: {
                            Objects: listedObjects.Contents.map(({ Key }) => ({ Key }))
                        }
                    };

                    const deleteCommand = new DeleteObjectsCommand(deleteParams);
                    await s3Client.send(deleteCommand);
                }

                // Cek apakah masih ada sisa file selanjutnya (file > 1000)
                isTruncated = listedObjects.IsTruncated;
                continuationToken = listedObjects.NextContinuationToken;
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: `Seluruh data media milik user ${userId} berhasil dibumihanguskan.` 
        });

    } catch (error) {
        console.error("Error deleting S3 folder:", error);
        return res.status(500).json({ error: "Gagal menghapus file di storage server." });
    }
}
