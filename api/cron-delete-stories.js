const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");

// Setup Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Setup S3 Biznet
const s3Client = new S3Client({
    region: "idn",
    endpoint: "https://nos.wjv-1.neo.id",
    credentials: {
        accessKeyId: process.env.BIZNET_ACCESS_KEY,
        secretAccessKey: process.env.BIZNET_SECRET_KEY,
    },
    forcePathStyle: true,
});

module.exports = async function handler(req, res) {
    try {
        const batasWaktu = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: expiredStories, error } = await supabase
            .from('stories')
            .select('id, media_url')
            .lt('created_at', batasWaktu);

        if (error) throw error;
        if (!expiredStories || expiredStories.length === 0) {
            return res.status(200).json({ message: "Tidak ada status kedaluwarsa. Area bersih!" });
        }

        const bucketName = process.env.BIZNET_BUCKET_NAME;

        for (const story of expiredStories) {
            if (story.media_url) {
                try {
                    let key = story.media_url.replace(`https://${bucketName}.nos.wjv-1.neo.id/`, '');
                    key = key.replace(`https://nos.wjv-1.neo.id/${bucketName}/`, '');

                    await s3Client.send(new DeleteObjectCommand({
                        Bucket: bucketName,
                        Key: decodeURIComponent(key)
                    }));
                } catch (s3Error) {
                    console.error("Gagal hapus file S3:", story.media_url, s3Error);
                }
            }
        }

        const listIds = expiredStories.map(s => s.id);
        await supabase.from('stories').delete().in('id', listIds);

        return res.status(200).json({ 
            success: true, 
            message: `${expiredStories.length} status berhasil disapu bersih!` 
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
