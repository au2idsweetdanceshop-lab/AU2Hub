import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
    // Pastikan hanya menerima GET
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL; 
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY; 
        
        if (!supabaseUrl || !supabaseAnonKey) return res.status(500).json({ success: false, error: `ENV Kosong!` });
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ success: false, error: 'Unauthorized' });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ success: false, error: 'Unauthorized Supabase' });

        const bucketName = process.env.BIZNET_BUCKET_NAME?.trim();
        const accessKey = process.env.BIZNET_ACCESS_KEY?.trim();
        const secretKey = process.env.BIZNET_SECRET_KEY?.trim();

        if (!bucketName || !accessKey || !secretKey) return res.status(500).json({ success: false, error: 'ENV S3 Biznet kosong!' });

        const client = new S3Client({
            region: "idn", 
            endpoint: "https://nos.wjv-1.neo.id", 
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
            forcePathStyle: true, 
        });

        const { filetype, filename } = req.query;
        if (!filetype || !filename) return res.status(400).json({ success: false, error: 'Parameter filetype dan filename wajib diisi!' });

        // 🔥 PERTAHANAN 1: Filter MimeType (Hanya Boleh Media)
        const allowedTypes = ['image/', 'video/', 'audio/'];
        const isAllowedType = allowedTypes.some(type => filetype.startsWith(type));
        if (!isAllowedType) {
            return res.status(403).json({ success: false, error: 'Tipe file tidak diizinkan! Hanya boleh foto, video, atau audio.' });
        }

        // 🔥 PERTAHANAN 2: Cegah Manipulasi Path & Impersonasi
        let safePath = filename;
        
        // A. Wajib di dalam foldernya sendiri (Berdasarkan Token Supabase)
        if (!safePath.startsWith(`${user.id}/`) && !safePath.startsWith(`groups/`)) {
            return res.status(403).json({ success: false, error: 'Akses Ditolak: Anda hanya boleh mengupload ke folder Anda sendiri.' });
        }
        
        // B. Cegah Path Traversal (Hacker memaksa mundur folder pakai ../)
        if (safePath.includes('..')) {
            return res.status(403).json({ success: false, error: 'Path Traversal Terdeteksi!' });
        }
        
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: safePath,
            ContentType: filetype
        });
        
        const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
        return res.status(200).json({
            success: true,
            uploadUrl: uploadUrl,
            finalVideoUrl: `https://nos.wjv-1.neo.id/${bucketName}/${safePath}`
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
