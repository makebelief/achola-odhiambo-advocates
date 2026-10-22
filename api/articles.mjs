const fields = 'slug,title,description,category,author_name,cover_image_url,image_alt,published_at';
export default async function handler(_request, response) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response.status(503).json({ error: 'Publishing service is not configured.' });
  try {
    const result = await fetch(`${url}/rest/v1/articles?select=${fields}&status=eq.published&order=published_at.desc`, { headers: { apikey: key } });
    if (!result.ok) throw new Error(`Article service returned ${result.status}`);
    const articles = await result.json();
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response.status(200).json({ articles });
  } catch {
    return response.status(502).json({ error: 'Articles are temporarily unavailable.' });
  }
}
