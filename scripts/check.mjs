import fs from 'node:fs';
import path from 'node:path';

const site = path.resolve('site');
const pages = ['index', 'about', 'practice-areas', 'managing-partner', 'insights', 'contact', 'privacy', 'terms', 'legal-notice'];
const errors = [];
const required = [
  ...pages.map(page => `${page}.html`),
  ...['404', '500', '503', '504'].map(code => `${code}.html`),
  'robots.txt', 'sitemap.xml', 'site.webmanifest', '_headers',
  'assets/css/site.css', 'assets/js/site.js', 'images/favicon.svg', 'images/social-card-v2.jpg',
  'assets/media/logo-dark.svg', 'assets/media/logo-light.svg'
];
for (const relative of required) {
  if (!fs.existsSync(path.join(site, relative))) errors.push(`Missing ${relative}`);
}
for (const page of [...pages, '404', '500', '503', '504']) {
  const filename = `${page}.html`;
  if (!fs.existsSync(path.join(site, filename))) continue;
  const text = fs.readFileSync(path.join(site, filename), 'utf8');
  const fail = issue => errors.push(`${filename}: ${issue}`);
  if (!text.includes('viewport-fit=cover')) fail('missing mobile viewport');
  if ((text.match(/<h1\b/g) || []).length !== 1) fail('must have exactly one H1');
  if (!/<title>[^<]+<\/title>/.test(text)) fail('missing title');
  if (!/<meta name="description" content="[^"]+">/.test(text)) fail('missing meta description');
  if (!/<link rel="canonical" href="https:\/\/[^"\s]+">/.test(text)) fail('missing valid canonical');
  if (/<(?:script|style)\b[^>]*>\s*(?:alert\(|eval\()/i.test(text)) fail('unsafe inline script');
  if (/\s(?:onclick|onerror|onload|onfocus|style)\s*=/i.test(text)) fail('inline handlers/styles forbidden by CSP');
  if (['404', '500', '503', '504'].includes(page) && !text.includes('name="robots" content="noindex')) fail('error pages must be noindex');
  for (const img of text.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]*"/.test(img[0])) fail('image without alt');
    if (!/\bwidth="\d+"/.test(img[0]) || !/\bheight="\d+"/.test(img[0])) fail('image without intrinsic dimensions');
  }
  for (const link of text.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const url = link[1].split(/[?#]/)[0];
    if (url === '/' || url.startsWith('//')) continue;
    const absolute = path.join(site, url.slice(1));
    if (url.startsWith('/assets/') || url.startsWith('/images/') || ['site.webmanifest','robots.txt','sitemap.xml'].includes(url.slice(1))) {
      if (!fs.existsSync(absolute)) fail(`missing asset ${url}`);
    } else if (!fs.existsSync(`${absolute}.html`) && !fs.existsSync(path.join(absolute, 'index.html'))) {
      fail(`broken internal link ${url}`);
    }
  }
  for (const script of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (script[0].includes('type="application/ld+json"')) {
      try { JSON.parse(script[1]); } catch { fail('invalid JSON-LD'); }
    } else if (!/^<script src="\/assets\/js\/[^" ]+" defer><\/script>$/.test(script[0])) {
      fail('unexpected inline or third-party script');
    }
  }
}
if (fs.existsSync(path.join(site, 'contact.html'))) {
  const contact = fs.readFileSync(path.join(site, 'contact.html'), 'utf8');
  if (!/name="whatsapp-consent" required/.test(contact)) errors.push('Contact form missing mandatory WhatsApp consent');
}
for (const s of fs.readdirSync(site, { withFileTypes: true })) {
  if (s.isFile() && s.name.endsWith('.html')) {
    const contents = fs.readFileSync(path.join(site, s.name), 'utf8');
    if (/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|\b(?:ghp_|sk_live_)[a-zA-Z0-9]{12}/.test(contents)) errors.push(`Potential secret in ${s.name}`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Source checks passed: ${pages.length} content pages, 4 error pages, no missing local links or assets, SEO and form safeguards present.`);
