const supabaseOrigin = 'https://ihctupovvhwdmdaawesj.supabase.co';

export const baseSecurityHeaders = {
  'Cache-Control': 'no-store',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Permitted-Cross-Domain-Policies': 'none'
};

export const articleCsp = hash => `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self' 'sha256-${hash}'; style-src 'self'; img-src 'self' data: ${supabaseOrigin}; font-src 'self'; connect-src 'self'; media-src 'self'; manifest-src 'self'; upgrade-insecure-requests`;

export function response(body, status, contentType, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: { ...baseSecurityHeaders, 'Content-Type': contentType, ...extraHeaders }
  });
}

export const json = (value, status = 200) => response(JSON.stringify(value), status, 'application/json; charset=utf-8');
export const text = (value, status = 200) => response(value, status, 'text/plain; charset=utf-8');

export function publishingConfig(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url: String(url).replace(/\/$/, ''), key: String(key) };
}

export function siteOrigin(request, env) {
  const configured = String(env.SITE_URL || '').trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' && url.origin === configured.replace(/\/$/, '')) return url.origin;
    } catch {}
  }
  return new URL(request.url).origin;
}

export async function sha256Base64(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
