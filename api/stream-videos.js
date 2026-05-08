// File: api/get-videos.js

export default function handler(req, res) {
    // Ini adalah daftar video yang akan dikirim ke website
    const videos = [
        { 
            id: 'vid-01', 
            caption: 'Tes video pertama lancar!', 
            file_id: 'AAMCBQADGQEDFhK7af4kTVxdieF6AT4yJltZlkyQURYAAh4cAAKO_PBXiVxpfJ40tJoBAAdtAAM7BA' // Ganti dengan file_id aslimu
        },
        { 
            id: 'vid-02', 
            caption: 'Lanjut video kedua', 
            file_id: 'MASUKKAN_FILE_ID_TELEGRAM_DI_SINI_2' // Ganti dengan file_id aslimu
        }
    ];

    // Kirim data ke website dengan status 200 (Sukses)
    res.status(200).json(videos);
}
