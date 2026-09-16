import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
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

        // 🔥 WAJIB "idn" AGAR SIGNATURE COCOK DENGAN SERVER BIZNET
        const client = new S3Client({
            region: "idn", 
            endpoint: "https://nos.wjv-1.neo.id", 
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
            forcePathStyle: true, 
        });

        if (req.method === 'GET') {
            const { filetype, filename } = req.query;
            const ext = filetype ? filetype.split('/')[1] : 'bin';
            const safeFilename = Math.random().toString(36).substring(2, 15);
            const serverGeneratedPath = filename ? filename : `uploads/${user.id}/${Date.now()}_${safeFilename}.${ext}`;
            
            // 🔥 WAJIB TANPA ACL AGAR TIDAK DITOLAK (403) OLEH BIZNET
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: serverGeneratedPath,
                ContentType: filetype
            });
            
            try {
                const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
                return res.status(200).json({
                    success: true,
                    uploadUrl: uploadUrl,
                    finalVideoUrl: `https://nos.wjv-1.neo.id/${bucketName}/${serverGeneratedPath}`
                });
            } catch (s3SignError) {
                return res.status(500).json({ success: false, error: 'Gagal S3: ' + s3SignError.message });
            }
        }
        return res.status(405).json({ success: false });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
