import { publishingConfig, response, siteOrigin, text } from './_shared/responses.js';

const escapeXml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const staticPages = [
  ['/', 'weekly', '1.0'], ['/about', 'monthly', '0.8'], ['/practice-areas', 'monthly', '0.8'],
  ['/managing-partner', 'monthly', '0.8'], ['/insights', 'weekly', '0.8'], ['/contact', 'monthly', '0.8'],
  ['/privacy', 'monthly', '0.8'], ['/terms', 'monthly', '0.8'], ['/legal-notice', 'monthly', '0.8']
];

export async function onRequestGet({ request, env }) {
  const config = publishingConfig(env);
  if (!config) return text('Sitemap unavailable', 503);
  try {
    const result = await fetch(`${config.url}/rest/v1/articles?select=slug,updated_at&status=eq.published&order=published_at.desc`, {
      headers: { apikey: config.key, Accept: 'application/json' }
    });
    if (!result.ok) throw new Error(`Article service returned ${result.status}`);
    const origin = siteOrigin(request, env);
    const urls = staticPages.map(([path, frequency, priority]) => `<url><loc>${origin}${path}</loc><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`);
    for (const article of await result.json()) {
      urls.push(`<url><loc>${origin}/insights/${escapeXml(article.slug)}</loc><lastmod>${escapeXml(String(article.updated_at).slice(0, 10))}</lastmod><changefreq>yearly</changefreq><priority>0.7</priority></url>`);
    }
    return response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`, 200, 'application/xml; charset=utf-8');
  } catch {
    return text('Sitemap unavailable', 502);
  }
}
