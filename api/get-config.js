export default function handler(req, res) {
    // Fungsi ini mengambil URL Google Apps Script dari Environment Variables Vercel
    // agar tidak tertulis langsung (hardcode) di file index.html
    res.status(200).json({
        gasUrl: process.env.GAS_URL
    });
}
