const siteUrl = 'https://achola-odhiambo-advocates.vercel.app';
const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const staticPages = [
  ['/', 'weekly', '1.0'], ['/about', 'monthly', '0.8'], ['/practice-areas', 'monthly', '0.8'],
  ['/managing-partner', 'monthly', '0.8'], ['/insights', 'weekly', '0.8'], ['/contact', 'monthly', '0.8'],
  ['/privacy', 'monthly', '0.8'], ['/terms', 'monthly', '0.8'], ['/legal-notice', 'monthly', '0.8']
];

export default async function handler(_request, response) {
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response.status(503).send('Sitemap unavailable');
  try {
    const result = await fetch(`${url}/rest/v1/articles?select=slug,updated_at&status=eq.published&order=published_at.desc`, { headers: { apikey: key } });
    if (!result.ok) throw new Error();
    const articles = await result.json();
    const urls = staticPages.map(([path, frequency, priority]) => `<url><loc>${siteUrl}${path}</loc><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`);
    for (const article of articles) urls.push(`<url><loc>${siteUrl}/insights/${escapeXml(article.slug)}</loc><lastmod>${escapeXml(String(article.updated_at).slice(0, 10))}</lastmod><changefreq>yearly</changefreq><priority>0.7</priority></url>`);
    return response.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`);
  } catch { return response.status(502).send('Sitemap unavailable'); }
}
