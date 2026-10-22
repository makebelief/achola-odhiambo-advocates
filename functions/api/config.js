import { json, publishingConfig } from '../_shared/responses.js';

export function onRequestGet({ env }) {
  const config = publishingConfig(env);
  if (!config) return json({ error: 'Publishing service is not configured.' }, 503);
  return json({ supabaseUrl: config.url, supabasePublishableKey: config.key });
}
