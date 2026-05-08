export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const file_id = url.searchParams.get('file_id');
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!file_id) return new Response("Missing file_id", { status: 400 });

  try {
    const getPath = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${file_id}`);
    const pathData = await getPath.json();
    
    if (!pathData.ok) return new Response("File not found", { status: 404 });

    const filePath = pathData.result.file_path;
    const videoUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // JURUS CACHE 1 HARI: Vercel akan mengingat URL ini selama 24 jam!
    return new Response(null, {
      status: 302,
      headers: {
        'Location': videoUrl,
        'Cache-Control': 's-maxage=86400, stale-while-revalidate',
        'Content-Type': 'video/mp4'
      }
    });
  } catch (err) {
    return new Response("Server Error", { status: 500 });
  }
}
