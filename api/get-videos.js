// File: api/get-videos.js

export default function handler(req, res) {
    // Di sini adalah daftar video yang akan muncul di feed
    const daftarVideo = [
        { 
            id: 'vid-01', 
            caption: 'Review Joki Ballroom AU2ID - 100% Aman', 
            file_id: 'AAMCBQADGQEDFhK7af4kTVxdieF6AT4yJltZlkyQURYAAh4cAAKO_PBXiVxpfJ40tJoBAAdtAAM7BA' // <-- Masukkan File ID dari @ShowJsonBot
        },
    ];

    // Mengirim daftar ini dalam format JSON agar bisa dibaca index.html
    res.status(200).json(daftarVideo);
}
