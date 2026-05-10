const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.BIZNET_ACCESS_KEY,
    secretAccessKey: process.env.BIZNET_SECRET_KEY,
    endpoint: 'https://neo.s3.biznetgio.com', // Sesuaikan URL Biznet-mu jika berbeda
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
});

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { filename, filetype } = req.query;
    const uniqueFileName = `${Date.now()}-${filename.replace(/\s+/g, '-')}`; 

    const params = {
        Bucket: process.env.BIZNET_BUCKET_NAME,
        Key: `videos/${uniqueFileName}`,
        Expires: 60, 
        ContentType: filetype,
        ACL: 'public-read'
    };

    try {
        const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
        res.status(200).json({ 
            uploadUrl: uploadUrl, 
            finalVideoUrl: `https://neo.s3.biznetgio.com/${process.env.BIZNET_BUCKET_NAME}/videos/${uniqueFileName}` 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
