const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const s3Client = new S3Client({
    region: "idn",
    endpoint: "https://nos.wjv-1.neo.id",
    credentials: {
        accessKeyId: process.env.BIZNET_ACCESS_KEY,
        secretAccessKey: process.env.BIZNET_SECRET_KEY,
    },
    forcePathStyle: true,
});

function hitungPotonganSeller(harga) {
    if (harga <= 25000) return 1000;
    if (harga <= 50000) return 2000;
    if (harga <= 99999) return 3000;
    if (harga <= 499999) return 10000;
    if (harga <= 1000000) return 20000;
    if (harga <= 1499999) return 20000;
    if (harga <= 1999999) return 25000;
    return 35000;
}

function hitungPendapatanBersih(hargaGateway, ditanggungPembeli, namaProduk = "") {
    let hargaAktual = hargaGateway;
    if (namaProduk.includes('[+Rekber]')) {
        if (hargaAktual >= 2035000) hargaAktual -= 35000;
        else if (hargaAktual >= 1525000) hargaAktual -= 25000;
        else if (hargaAktual >= 520000) hargaAktual -= 20000;
        else if (hargaAktual >= 110000) hargaAktual -= 10000;
        else hargaAktual -= 5000;
    }
    const hargaBase = Math.round((hargaAktual - 500) / 1.007);
    if (ditanggungPembeli) {
        if (hargaBase <= 26000) return hargaBase - 1000;
        if (hargaBase <= 52000) return hargaBase - 2000;
        if (hargaBase <= 102999) return hargaBase - 3000;
        if (hargaBase <= 509999) return hargaBase - 10000;
        if (hargaBase <= 1519999) return hargaBase - 20000;
        if (hargaBase <= 2024999) return hargaBase - 25000;
        return hargaBase - 35000;
    } else {
        return hargaBase - hitungPotonganSeller(hargaBase);
    }
}

module.exports = async function handler(req, res) {
    try {
        let logPesan = [];
        
        // ==========================================
        // TUGAS 1: HAPUS STORY > 24 JAM
        // ==========================================
        const batasWaktuStory = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: expiredStories, error: errStories } = await supabase
            .from('stories')
            .select('id, media_url')
            .lt('created_at', batasWaktuStory);
            
        if (errStories) throw errStories;
        
        if (!expiredStories || expiredStories.length === 0) {
            logPesan.push("Tugas 1 (Story): Bersih");
        } else {
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
                        console.error("Gagal hapus file S3 (Story):", story.media_url, s3Error);
                    }
                }
            }
            const listIds = expiredStories.map(s => s.id);
            await supabase.from('stories').delete().in('id', listIds);
            logPesan.push(`Tugas 1 (Story): ${expiredStories.length} status dihapus`);
        }

        // ==========================================
        // TUGAS 2: PENCAIRAN SALDO OTOMATIS > 24 JAM
        // ==========================================
        const { data: ordersToClear, error: fetchErr } = await supabase
            .from('orders_player')
            .select('id, price, product_name, waktu_selesai, seller_id, player_products(fee_ditanggung_pembeli)')
            .eq('status', 'selesai')
            .eq('dana_cair', false);
            
        if (fetchErr) throw fetchErr;
        
        if (!ordersToClear || ordersToClear.length === 0) {
            logPesan.push("Tugas 2 (Saldo): Tidak ada antrean");
        } else {
            const sekarang = new Date();
            let totalDicairkan = 0;
            let jumlahTercairkan = 0;
            
            for (let order of ordersToClear) {
                if (!order.waktu_selesai) {
                    await supabase.from('orders_player').update({ waktu_selesai: sekarang.toISOString() }).eq('id', order.id);
                    continue;
                }
                const waktuSelesai = new Date(order.waktu_selesai);
                const selisihJam = Math.abs(sekarang - waktuSelesai) / 36e5;
                if (selisihJam >= 24) {
                    const isPembeli = order.player_products?.fee_ditanggung_pembeli || false;
                    const pendapatanBersih = hitungPendapatanBersih(order.price, isPembeli, order.product_name);
                    await supabase.rpc('proses_pencairan_otomatis', {
                        p_seller_id: order.seller_id,
                        p_jumlah: pendapatanBersih,
                        p_deskripsi: `Pencairan H+1: ${order.product_name}`
                    });
                    await supabase.from('orders_player').update({ dana_cair: true }).eq('id', order.id);
                    totalDicairkan += pendapatanBersih;
                    jumlahTercairkan++;
                }
            }
            if (jumlahTercairkan > 0) {
                logPesan.push(`Tugas 2 (Saldo): Cair ${jumlahTercairkan} pesanan (Total Rp ${totalDicairkan})`);
            } else {
                logPesan.push(`Tugas 2 (Saldo): Ada ${ordersToClear.length} antrean, belum genap 24 jam.`);
            }
        }

        // ==========================================
        // TUGAS 3: HAPUS VIDEO FEED > 30 HARI
        // ==========================================
        let videoTerhapus = 0;
        try {
            const batasWaktuVideo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            
            // Dapatkan URL dasar server untuk memanggil API get-config & get-videos
            const host = req.headers.host || 'au2idsweetdance.com';
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const baseUrl = `${protocol}://${host}`;

            const configRes = await fetch(`${baseUrl}/api/get-config`);
            const config = await configRes.json();

            if (config && config.gasUrl) {
                const videoRes = await fetch(`${baseUrl}/api/get-videos`);
                const allVideos = await videoRes.json();

                // Saring video yang lebih dari 30 hari
                const expiredVideos = allVideos.filter(v => {
                    if (!v.created_at) return false;
                    return new Date(v.created_at) < new Date(batasWaktuVideo);
                });

                if (expiredVideos.length > 0) {
                    const bucketName = process.env.BIZNET_BUCKET_NAME;
                    
                    for (const vid of expiredVideos) {
                        // A. Hapus dari Biznet S3
                        if (vid.video_url) {
                            try {
                                let key = vid.video_url.replace(`https://${bucketName}.nos.wjv-1.neo.id/`, '');
                                key = key.replace(`https://nos.wjv-1.neo.id/${bucketName}/`, '');
                                await s3Client.send(new DeleteObjectCommand({
                                    Bucket: bucketName,
                                    Key: decodeURIComponent(key)
                                }));
                            } catch (s3Error) {
                                console.error("Gagal hapus file S3 (Video):", vid.video_url, s3Error);
                            }
                        }

                        // B. Hapus baris data dari Google Sheets (Via API Google Apps Script)
                        await fetch(config.gasUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain' },
                            body: JSON.stringify({ 
                                action: 'DELETE', 
                                id: vid.id || vid.video_id || vid.ID 
                            })
                        });
                        videoTerhapus++;
                    }
                    logPesan.push(`Tugas 3 (Feed): ${videoTerhapus} video dihapus`);
                } else {
                    logPesan.push("Tugas 3 (Feed): Bersih");
                }
            } else {
                logPesan.push("Tugas 3 (Feed): Dilewati (GAS URL tidak ditemukan)");
            }
        } catch (errVideo) {
            console.error("Error Tugas 3 (Feed):", errVideo);
            logPesan.push("Tugas 3 (Feed): Gagal dieksekusi");
        }

        // ==========================================
        // HASIL AKHIR CRON
        // ==========================================
        return res.status(200).json({ 
            success: true, 
            message: logPesan.join(' | ')
        });

    } catch (error) {
        console.error("Cron Job Terhenti karena Error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}
