const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Hanya menerima POST' });

    try {
        // --- SISTEM PELACAK KUNCI VERCEL ---
        const endpoint = process.env.BIZNET_ENDPOINT;
        const accessKey = process.env.BIZNET_ACCESS_KEY;
        const secretKey = process.env.BIZNET_SECRET_KEY;
        const bucket = process.env.BIZNET_BUCKET;

        // Jika ada satu saja kunci yang kosong, mesin akan lapor!
        if (!endpoint || !accessKey || !secretKey || !bucket) {
            return res.status(400).json({
                success: false,
                error: `VERCEL GAGAL MEMBACA KUNCI! Status: Endpoint(${!!endpoint}), AccessKey(${!!accessKey}), SecretKey(${!!secretKey}), Bucket(${!!bucket})`
            });
        }
        // ------------------------------------

        const { fileBase64, userId } = req.body;

        const s3 = new S3Client({
            region: "us-east-1",
            endpoint: endpoint,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
            forcePathStyle: true
        });

        const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `avatars/${userId}_${Date.now()}.jpg`;

        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: fileName,
            Body: buffer,
            ContentType: 'image/jpeg',
            ACL: 'public-read'
        }));

        const publicUrl = `${endpoint}/${bucket}/${fileName}`;
        res.status(200).json({ success: true, url: publicUrl });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}
