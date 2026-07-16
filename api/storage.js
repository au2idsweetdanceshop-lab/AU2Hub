import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; 
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
];
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
    const origin = req.headers.origin || req.headers.referer;
    const isWebhook = (req.body && req.body.action === 'webhook') || req.url.includes('webhook');
    if (!isWebhook && origin) {
        if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {
            return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });
        }
    }
    const action = req.query.action || req.body?.action;
    const bucketName = process.env.BIZNET_BUCKET_NAME;
    if (action === 'upload') {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Akses ditolak!' });
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Token tidak valid atau kadaluarsa.' });
        }
        if (req.method === 'POST') {
            try {
                const { fileBase64, filetype } = req.body;
                if (!fileBase64 || !filetype) {
                    return res.status(400).json({ success: false, error: 'Data file tidak lengkap' });
                }
                if (!ALLOWED_MIME_TYPES.includes(filetype)) {
                    return res.status(400).json({ success: false, error: 'Format file berbahaya/tidak diizinkan!' });
                }
                const base64Data = fileBase64.replace(/^data:\w+\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const ext = filetype.split('/')[1];
                const safeFilename = crypto.randomUUID();
                const uniqueFileName = `media/${user.id}/${Date.now()}_${safeFilename}.${ext}`;
                const command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: uniqueFileName,
                    Body: buffer,
                    ContentType: filetype,
                    ACL: 'public-read'
                });
                await s3Client.send(command);
                return res.status(200).json({
                    success: true,
                    url: `https://${bucketName}.nos.wjv-1.neo.id/${uniqueFileName}`
                });
            } catch (err) {
                console.error("Direct Upload Error:", err);
                return res.status(500).json({ success: false, error: 'Gagal mengunggah file' });
            }
        }
        if (req.method === 'GET') {
            const { filetype } = req.query;
            if (!filetype) {
                return res.status(400).json({ success: false, error: 'Parameter filetype wajib disertakan' });
            }
            if (!ALLOWED_MIME_TYPES.includes(filetype)) {
                return res.status(400).json({ success: false, error: 'Format file tidak diizinkan!' });
            }
            try {
                const ext = filetype.split('/')[1];
                const safeFilename = crypto.randomUUID();
                const serverGeneratedPath = `uploads/${user.id}/${Date.now()}_${safeFilename}.${ext}`;
                const command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: serverGeneratedPath,
                    ContentType: filetype,
                    ACL: 'public-read' 
                });
                const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
                return res.status(200).json({
                    success: true,
                    uploadUrl: uploadUrl,
                    finalVideoUrl: `https://${bucketName}.nos.wjv-1.neo.id/${serverGeneratedPath}`
                });
            } catch (err) {
                console.error("Presigned URL Error:", err);
                return res.status(500).json({ success: false, error: 'Gagal membuat URL aman' });
            }
        }
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, error: `Method ${req.method} tidak diizinkan` });
    }
    else if (action === 'delete') {
        if (req.method !== 'DELETE' && req.method !== 'POST') {
            res.setHeader('Allow', ['DELETE', 'POST']);
            return res.status(405).json({ success: false, error: "Method Not Allowed" });
        }
        if (!bucketName || !process.env.BIZNET_ACCESS_KEY || !process.env.BIZNET_SECRET_KEY) {
            console.error("[S3 Error]: Environment Variables untuk konfigurasi S3 belum lengkap.");
            return res.status(500).json({ success: false, error: "Konfigurasi S3 belum lengkap di Environment Variables." });
        }
        const type = req.query.type || req.body?.type;
        try {
            if (type === 'file') {
                const fileUrl = req.body?.fileUrl || req.query?.fileUrl;
                if (!fileUrl) {
                    return res.status(400).json({ success: false, error: "URL file wajib disertakan" });
                }
                const baseUrl1 = `https://${bucketName}.nos.wjv-1.neo.id/`;
                const baseUrl2 = `https://nos.wjv-1.neo.id/${bucketName}/`;
                let key = fileUrl;
                if (fileUrl.startsWith(baseUrl1)) {
                    key = fileUrl.replace(baseUrl1, '');
                } else if (fileUrl.startsWith(baseUrl2)) {
                    key = fileUrl.replace(baseUrl2, '');
                }
                key = key.split('?')[0]; 
                if (!key || key === fileUrl) {
                    return res.status(400).json({ success: false, error: "Format URL tidak valid." });
                }
                await s3Client.send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: decodeURIComponent(key) 
                }));
                return res.status(200).json({ success: true, message: "File berhasil diledakkan." });
            }
            else if (type === 'folder') {
                const userId = req.query?.userId || req.body?.userId;
                if (!userId) {
                    return res.status(400).json({ success: false, error: "User ID wajib disertakan" });
                }
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
                return res.status(400).json({ success: false, error: "Parameter type (?type=file atau ?type=folder) wajib diisi dengan benar." });
            }
        } catch (error) {
            console.error(`[S3 Delete Error - Type: ${type || 'unknown'}]:`, error);
            return res.status(500).json({ 
                success: false, 
                error: "Gagal memproses penghapusan di storage server.",
                details: error.message
            });
        }
    }
    else {
        return res.status(400).json({ success: false, error: "Parameter action tidak valid atau tidak disertakan." });
    }
}
