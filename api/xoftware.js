export default async function handler(req, res) {
  const API_KEY = process.env.XOFTWARE_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      success: false,
      error: "XOFTWARE_API_KEY belum diisi di Vercel"
    });
  }

  res.status(200).json({
    success: true,
    message: "API key sudah terbaca",
    keyExists: true
  });
}
