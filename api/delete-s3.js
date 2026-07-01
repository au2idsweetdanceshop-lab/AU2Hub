import { S3Client, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Setup S3 Biznet (Dideklarasikan di luar handler agar lebih efisien pada serverless cold-start)
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
    // ==========================================
// 🛡️ PROTEKSI CORS: HANYA IZINKAN DOMAIN SENDIRI
// ==========================================
const origin = req.headers.origin || req.headers.referer;
// Kecualikan webhook dari pengecekan origin karena webhook dikirim oleh server Xoftware/Digiflazz, bukan dari browser
const isWebhook = (req.body && req.body.action === 'webhook') || req.url.includes('webhook');

if (!isWebhook && origin) {
    if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {
        return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });
    }
}
    // Mengizinkan metode DELETE atau POST
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        res.setHeader('Allow', ['DELETE', 'POST']);
        return res.status(405).json({ success: false, error: "Method Not Allowed" });
    }

    const bucketName = process.env.BIZNET_BUCKET_NAME;
    
    // Validasi ketersediaan Environment Variables
    if (!bucketName || !process.env.BIZNET_ACCESS_KEY || !process.env.BIZNET_SECRET_KEY) {
        console.error("[S3 Error]: Environment Variables untuk konfigurasi S3 belum lengkap.");
        return res.status(500).json({ success: false, error: "Konfigurasi S3 belum lengkap di Environment Variables." });
    }

    // Tangkap mode yang direquest: 'file' (hapus satuan) atau 'folder' (hapus massal)
    const type = req.query.type || req.body?.type;

    try {
        // =========================================================
        // MODE 1: HAPUS FILE SATUAN
        // =========================================================
        if (type === 'file') {
            const fileUrl = req.body?.fileUrl || req.query?.fileUrl;
            
            if (!fileUrl) {
                return res.status(400).json({ success: false, error: "URL file wajib disertakan" });
            }

            // Mendukung dua format URL Biznet Neo (Virtual-Hosted & Path style)
            const baseUrl1 = `https://${bucketName}.nos.wjv-1.neo.id/`;
            const baseUrl2 = `https://nos.wjv-1.neo.id/${bucketName}/`;

            let key = fileUrl;
            if (fileUrl.startsWith(baseUrl1)) {
                key = fileUrl.replace(baseUrl1, '');
            } else if (fileUrl.startsWith(baseUrl2)) {
                key = fileUrl.replace(baseUrl2, '');
            }

            // 🔥 PERBAIKAN: Buang query parameter (?t=...) jika ada
            key = key.split('?')[0]; 

            if (!key || key === fileUrl) {
                return res.status(400).json({ success: false, error: "Format URL tidak valid." });
            }

            // Eksekusi penghapusan single file
            await s3Client.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: decodeURIComponent(key) 
            }));

            return res.status(200).json({ success: true, message: "File berhasil diledakkan." });
        } 
        
        // =========================================================
        // MODE 2: HAPUS FOLDER / SEMUA DATA USER
        // =========================================================
        else if (type === 'folder') {
            const userId = req.query?.userId || req.body?.userId;
            
            if (!userId) {
                return res.status(400).json({ success: false, error: "User ID wajib disertakan" });
            }

            // Target folder yang akan dihapus (Pastikan ada garis miring '/' di akhir)
            const foldersToDelete = [
                `${userId}/`,
                `avatars/${userId}/` 
            ];

            for (const prefix of foldersToDelete) {
                let isTruncated = true;
                let continuationToken = undefined;

                // Loop akan berjalan terus jika ada lebih dari 1000 object di dalam folder
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

                    // Cek apakah masih ada sisa file yang perlu diambil dari list
                    isTruncated = listedObjects.IsTruncated;
                    continuationToken = listedObjects.NextContinuationToken;
                }
            }

            return res.status(200).json({ success: true, message: `Semua data user ${userId} berhasil dibersihkan.` });
        } 
        
        // =========================================================
        // MODE TIDAK DIKENAL
        // =========================================================
        else {
            return res.status(400).json({ success: false, error: "Parameter type (?type=file atau ?type=folder) wajib diisi dengan benar." });
        }

    } catch (error) {
        // Log detail ke server console untuk kebutuhan debugging
        console.error(`[S3 Delete Error - Type: ${type || 'unknown'}]:`, error);
        return res.status(500).json({ 
            success: false, 
            error: "Gagal memproses penghapusan di storage server.",
            details: error.message
        });
    }
}
