import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Menaikkan batas ukuran payload agar video 50MB bisa diproses tanpa error PayloadTooLarge
export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } }
};

export default async function handler(req, res) {
    const bucketName = process.env.BIZNET_BUCKET_NAME;
    
    // Inisialisasi S3 Client untuk Biznet GIO
    const client = new S3Client({
        region: "idn", 
        endpoint: "https://nos.wjv-1.neo.id", 
        credentials: {
            accessKeyId: process.env.BIZNET_ACCESS_KEY,
            secretAccessKey: process.env.BIZNET_SECRET_KEY,
        },
        forcePathStyle: true,
    });

    // =======================================================================
    // JALUR 1: POST (Direct Upload untuk Base64) - ANTI CORS
    // =======================================================================
    if (req.method === 'POST') {
        try {
            const { fileBase64, filetype, folder = 'media' } = req.body;
            
            if (!fileBase64) {
                return res.status(400).json({ success: false, error: 'Tidak ada data file' });
            }

            // Bersihkan header "data:image/png;base64," jika terbawa dari frontend
            const base64Data = fileBase64.replace(/^data:\w+\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Ekstrak ekstensi dari filetype (misal 'audio/webm' jadi 'webm')
            const ext = filetype ? filetype.split('/')[1] : 'bin';
            const uniqueFileName = `${folder}/upload_${Date.now()}.${ext}`;

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: uniqueFileName,
                Body: buffer,
                ContentType: filetype || 'application/octet-stream',
                ACL: 'public-read' // Akses publik untuk dibaca frontend
            });

            await client.send(command);
            
            return res.status(200).json({
                success: true,
                url: `https://${bucketName}.nos.wjv-1.neo.id/${uniqueFileName}`
            });
        } catch (err) {
            console.error("Direct Upload Error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // =======================================================================
    // JALUR 2: GET (Generate Pre-signed URL untuk Upload Skala Besar)
    // =======================================================================
    if (req.method === 'GET') {
        const { filename, filetype } = req.query;

        if (!filename || !filetype) {
            return res.status(400).json({ success: false, error: 'Parameter filename dan filetype wajib disertakan' });
        }

        try {
            // Menggunakan filename langsung dari frontend karena sudah menyertakan 
            // path dinamis (contoh: id_user/feed_video/namafile.mp4)
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: filename,
                ContentType: filetype,
                ACL: 'public-read' 
            });

            // Token URL berlaku selama 1 jam (3600 detik)
            const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
            
            return res.status(200).json({
                success: true,
                uploadUrl: uploadUrl,
                finalVideoUrl: `https://${bucketName}.nos.wjv-1.neo.id/${filename}`
            });
        } catch (err) {
            console.error("Presigned URL Error:", err);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // =======================================================================
    // JALUR 3: REJECT METHOD SELAIN GET & POST
    // =======================================================================
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: `Method ${req.method} tidak diizinkan` });
}
