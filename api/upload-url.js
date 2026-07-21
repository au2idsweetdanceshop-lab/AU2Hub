import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime'
];

export default async function handler(req, res) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; 
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
        
        if (!supabaseUrl || !supabaseAnonKey) {
            return res.status(500).json({ success: false, error: 'Kunci Supabase belum diatur di Server!' });
        }
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const origin = req.headers.origin || req.headers.referer;
        const isWebhook = (req.body && req.body.action === 'webhook') || (req.url && req.url.includes('webhook'));

        if (!isWebhook && origin) {
            if (!origin.includes('au2idsweetdance.com') && !origin.includes('localhost')) {
                return res.status(403).json({ success: false, message: 'Akses Ditolak: Domain Tidak Sah!' });
            }
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Akses ditolak!' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Token tidak valid atau kadaluarsa.' });
        }

        const bucketName = process.env.BIZNET_BUCKET_NAME;
        const accessKey = process.env.BIZNET_ACCESS_KEY;
        const secretKey = process.env.BIZNET_SECRET_KEY;

        if (!bucketName || !accessKey || !secretKey) {
            return res.status(500).json({ success: false, error: 'Kredensial S3 Biznet hilang dari env server!' });
        }

        const client = new S3Client({
            region: "idn", 
            endpoint: "https://nos.wjv-1.neo.id", 
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
            forcePathStyle: true,
        });

        if (req.method === 'POST') {
            const { fileBase64, filetype } = req.body;
            if (!fileBase64 || !filetype) {
                return res.status(400).json({ success: false, error: 'Data file tidak lengkap' });
            }
            if (!ALLOWED_MIME_TYPES.includes(filetype)) {
                return res.status(400).json({ success: false, error: 'Format file berbahaya/tidak diizinkan!' });
            }
            
            const base64Data = fileBase64.replace(/^data:\w+\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const ext = filetype.split('/')[1] || 'bin';
            const safeFilename = crypto.randomUUID();
            const uniqueFileName = `media/${user.id}/${Date.now()}_${safeFilename}.${ext}`;
            
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: uniqueFileName,
                Body: buffer,
                ContentType: filetype,
                ACL: 'public-read'
            });
            await client.send(command);
            return res.status(200).json({
                success: true,
                url: `https://${bucketName}.nos.wjv-1.neo.id/${uniqueFileName}`
            });
        }

        if (req.method === 'GET') {
            const { filetype } = req.query;
            if (!filetype) {
                return res.status(400).json({ success: false, error: 'Parameter filetype wajib disertakan' });
            }
            if (!ALLOWED_MIME_TYPES.includes(filetype)) {
                return res.status(400).json({ success: false, error: 'Format file tidak diizinkan!' });
            }
            
            const ext = filetype.split('/')[1] || 'bin';
            const safeFilename = crypto.randomUUID();
            const serverGeneratedPath = `uploads/${user.id}/${Date.now()}_${safeFilename}.${ext}`;
            
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: serverGeneratedPath,
                ContentType: filetype,
                ACL: 'public-read' 
            });
            const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
            
            return res.status(200).json({
                success: true,
                uploadUrl: uploadUrl,
                finalVideoUrl: `https://${bucketName}.nos.wjv-1.neo.id/${serverGeneratedPath}`
            });
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ success: false, error: `Method ${req.method} tidak diizinkan` });

    } catch (error) {
        console.error("API Upload Error:", error);
        return res.status(500).json({ 
            success: false, 
            error: 'Sistem Error: ' + (error.message || 'Terjadi kesalahan') 
        });
    }
}
