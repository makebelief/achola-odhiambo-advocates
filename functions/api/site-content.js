import { json, publishingConfig } from '../_shared/responses.js';

export async function onRequestGet({ env }) {
  const config = publishingConfig(env);
  if (!config) return json({ error: 'Website content service is not configured.' }, 503);
  const headers = { apikey: config.key, Authorization: `Bearer ${config.key}` };
  try {
    const [contentResponse, areasResponse] = await Promise.all([
      fetch(`${config.url}/rest/v1/site_content?id=eq.1&select=*`, { headers }),
      fetch(`${config.url}/rest/v1/site_practice_areas?select=position,title,description&order=position.asc`, { headers })
    ]);
    if (!contentResponse.ok || !areasResponse.ok) throw new Error('Content request failed');
    const [contentRows, practiceAreas] = await Promise.all([contentResponse.json(), areasResponse.json()]);
    if (!contentRows[0] || practiceAreas.length !== 8) throw new Error('Website content is incomplete');
    const { updated_by: _updatedBy, ...content } = contentRows[0];
    return json({ content, practiceAreas });
  } catch {
    return json({ error: 'Website content is temporarily unavailable.' }, 503);
  }
}
