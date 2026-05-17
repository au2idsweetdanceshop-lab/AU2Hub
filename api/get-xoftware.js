export default async function handler(req, res) {
    // Ambil API Key dari Vercel Environment
    const apiKey = process.env.XOFTWARE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ status: false, message: 'API Key belum disetting' });
    }

    try {
        // PERHATIAN: Di dokumentasi biasanya ada ujung linknya (endpoint path).
        // Karena kamu cuma kasih Base URL, saya asumsikan ujungnya adalah '/profile' atau '/user'.
        // Kalau error, coba ganti '/profile' di bawah ini dengan ujung link yang benar dari dokumentasi Xoftware.
        const targetUrl = 'https://backend.xoftware.id/v1/profile'; 

        const response = await fetch(targetUrl, {
            method: 'GET', // Asumsi menggunakan GET. Jika butuh POST, ganti jadi 'POST'.
            headers: {
                'Content-Type': 'application/json',
                // Standar keamanan API biasanya pakai Bearer atau x-api-key
                'Authorization': `Bearer ${apiKey}`,
                'x-api-key': apiKey 
            }
        });

        const data = await response.json();

        // Kembalikan jawaban Xoftware langsung ke website (frontend) kamu
        return res.status(200).json(data);

    } catch (error) {
        console.error("Error fetching Xoftware API:", error);
        return res.status(500).json({ status: false, message: 'Gagal menghubungi server Xoftware' });
    }
}
