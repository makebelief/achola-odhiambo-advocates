import { json, publishingConfig } from '../_shared/responses.js';

const fields = 'slug,title,description,category,author_name,cover_image_url,image_alt,published_at';

export async function onRequestGet({ env }) {
  const config = publishingConfig(env);
  if (!config) return json({ error: 'Publishing service is not configured.' }, 503);
  try {
    const result = await fetch(`${config.url}/rest/v1/articles?select=${fields}&status=eq.published&order=published_at.desc`, {
      headers: { apikey: config.key, Accept: 'application/json' }
    });
    if (!result.ok) throw new Error(`Article service returned ${result.status}`);
    return json({ articles: await result.json() });
  } catch {
    return json({ error: 'Articles are temporarily unavailable.' }, 502);
  }
}
