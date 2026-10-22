import { articlePage } from './_article-page.mjs';
export default async function handler(request, response) {
  const slug = String(request.query.slug || '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return response.status(404).send('Article not found');
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response.status(503).send('Publishing service is not configured.');
  try {
    const query = `${url}/rest/v1/articles?select=slug,title,description,category,author_name,cover_image_url,image_alt,published_at,body_html&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`;
    const result = await fetch(query, { headers: { apikey: key, Accept: 'application/json' } });
    if (!result.ok) throw new Error(); const [article] = await result.json();
    if (!article) return response.status(404).send('Article not found');
    response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return response.status(200).send(articlePage(article));
  } catch { return response.status(502).send('Article temporarily unavailable'); }
}
