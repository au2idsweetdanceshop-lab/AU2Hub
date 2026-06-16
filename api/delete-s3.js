import { S3Client, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Setup S3 Biznet (Dideklarasikan di luar handler agar lebih efisien)
const s3Client = new S3Client({
    region: "idn",
    endpoint: "https://nos.wjv-1.neo.id",
    credentials: {
        accessKeyId: process.env.BIZNET_ACCESS_KEY,
        secretAccessKey: process.env.BIZNET_SECRET_KEY,
    },
    forcePathStyle: true,
});

export default async function handler(req, res) {
    // Mengizinkan DELETE atau POST
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.setHeader('Allow', ['DELETE', 'POST']);
        return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const bucketName = process.env.BIZNET_BUCKET_NAME;
    if (!bucketName || !process.env.BIZNET_ACCESS_KEY || !process.env.BIZNET_SECRET_KEY) {
        return res.status(500).json({ success: false, error: "Konfigurasi S3 belum lengkap di Environment Variables." });
    }

    // Tangkap mode yang direquest: 'file' (hapus satuan) atau 'folder' (hapus massal)
    const type = req.query.type || req.body?.type;

    try {
        // =========================================================
        // MODE 1: HAPUS FILE SATUAN (Pengganti delete-file.js)
        // =========================================================
        if (type === 'file') {
            const fileUrl = req.body?.fileUrl || req.query?.fileUrl;
            if (!fileUrl) return res.status(400).json({ success: false, error: "URL file wajib disertakan" });

            const baseUrl1 = `https://${bucketName}.nos.wjv-1.neo.id/`;
            const baseUrl2 = `https://nos.wjv-1.neo.id/${bucketName}/`;

            let key = fileUrl;
            if (fileUrl.startsWith(baseUrl1)) key = fileUrl.replace(baseUrl1, '');
            else if (fileUrl.startsWith(baseUrl2)) key = fileUrl.replace(baseUrl2, '');

            if (!key || key === fileUrl) {
                return res.status(400).json({ success: false, error: "Format URL tidak valid." });
            }

            await s3Client.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: decodeURIComponent(key) 
            }));

            return res.status(200).json({ success: true, message: "File berhasil diledakkan." });
        } 
        
        // =========================================================
        // MODE 2: HAPUS FOLDER / SEMUA DATA (Pengganti delete-folder.js)
        // =========================================================
        else if (type === 'folder') {
            const userId = req.query?.userId || req.body?.userId;
            if (!userId) return res.status(400).json({ success: false, error: "User ID wajib disertakan" });

            const foldersToDelete = [
                `${userId}/`,
                `avatars/${userId}/` 
            ];

            for (const prefix of foldersToDelete) {
                let isTruncated = true;
                let continuationToken = undefined;

                while (isTruncated) {
                    const listCommand = new ListObjectsV2Command({
                        Bucket: bucketName,
                        Prefix: prefix,
                        ContinuationToken: continuationToken
                    });
                    const listedObjects = await s3Client.send(listCommand);

                    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
                        const deleteParams = {
                            Bucket: bucketName,
                            Delete: {
                                Objects: listedObjects.Contents.map(({ Key }) => ({ Key }))
                            }
                        };
                        await s3Client.send(new DeleteObjectsCommand(deleteParams));
                    }

                    isTruncated = listedObjects.IsTruncated;
                    continuationToken = listedObjects.NextContinuationToken;
                }
            }

            return res.status(200).json({ success: true, message: `Semua data user ${userId} berhasil dibersihkan.` });
        } 
        
        else {
            return res.status(400).json({ success: false, error: "Parameter type (?type=file atau ?type=folder) wajib diisi." });
        }

    } catch (error) {
        console.error("Error S3 Delete:", error);
        return res.status(500).json({ success: false, error: "Gagal memproses penghapusan di storage server." });
    }
}
