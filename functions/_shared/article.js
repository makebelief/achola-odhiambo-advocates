import { articlePage } from '../../api/_article-page.mjs';
import { articleCsp, publishingConfig, response, sha256Base64, siteOrigin, text } from './responses.js';

export async function serveArticle(request, env, rawSlug) {
  const slug = String(rawSlug || '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return text('Article not found', 404);
  const config = publishingConfig(env);
  if (!config) return text('Publishing service is not configured.', 503);
  try {
    const query = `${config.url}/rest/v1/articles?select=slug,title,description,category,author_name,cover_image_url,image_alt,published_at,body_html&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`;
    const result = await fetch(query, { headers: { apikey: config.key, Accept: 'application/json' } });
    if (!result.ok) throw new Error(`Article service returned ${result.status}`);
    const [article] = await result.json();
    if (!article) return text('Article not found', 404);
    const page = articlePage(article, siteOrigin(request, env));
    const jsonLd = page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || '';
    const hash = await sha256Base64(jsonLd);
    return response(page, 200, 'text/html; charset=utf-8', { 'Content-Security-Policy': articleCsp(hash) });
  } catch {
    return text('Article temporarily unavailable', 502);
  }
}
