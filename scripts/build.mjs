import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SOURCE_SITE = 'https://achola-odhiambo-advocates.vercel.app';
const source = path.resolve('site');
const output = path.resolve('dist');

// A single optional Cloudflare Pages build variable controls EVERY absolute SEO URL.
// Never allow a typo, HTTP address, query string, or pathname to leak into canonicals.
function canonicalOrigin(value) {
  if (!value) return SOURCE_SITE;
  let url;
  try { url = new URL(value); } catch { throw Error('SITE_URL must be an absolute https:// URL'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash || url.port || (url.pathname !== '/' && url.pathname !== '')) {
    throw Error('SITE_URL must be an HTTPS origin such as https://example.co.ke (no path, query or fragment)');
  }
  return url.origin;
}
const siteUrl = canonicalOrigin(process.env.SITE_URL?.trim());
// Preview deployments and an unconfigured Cloudflare demo must not be indexed.
const noindexDeployment = Boolean(
  (process.env.CF_PAGES_BRANCH && process.env.CF_PAGES_BRANCH !== 'main') ||
  (process.env.CF_PAGES && !process.env.SITE_URL?.trim())
);
fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, output, { recursive: true });

const seoFiles = fs.readdirSync(output).filter(name => name.endsWith('.html')).map(name => path.join(output, name));
seoFiles.push(path.join(output, 'robots.txt'), path.join(output, 'sitemap.xml'));
for (const filename of seoFiles) {
  const contents = fs.readFileSync(filename, 'utf8');
  let updated = contents.replaceAll(SOURCE_SITE, siteUrl);
  if (noindexDeployment && filename.endsWith('.html') && !/<meta name="robots" content="noindex/.test(updated)) {
    updated = updated.replace('</head>', '<meta name="robots" content="noindex, nofollow"></head>');
  }
  fs.writeFileSync(filename, updated);
}

// Cloudflare Pages applies _headers only to static assets. Hash the exact inline
// JSON-LD scripts in the built HTML to keep executable inline JS disallowed by CSP.
const hashes = new Set();
for (const filename of seoFiles.filter(file => file.endsWith('.html'))) {
  const page = fs.readFileSync(filename, 'utf8');
  for (const match of page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (/^<script\s+src="\/assets\/js\/[^" ]+"\s+defer><\/script>$/.test(match[0])) continue;
    if (!/^<script\s+type="application\/ld\+json">/.test(match[0])) {
      throw Error(`Unexpected inline script in ${filename}; review the CSP before deploying`);
    }
    const hash = crypto.createHash('sha256').update(match[1]).digest('base64');
    hashes.add(`'sha256-${hash}'`);
  }
}
const template = fs.readFileSync(path.join(source, '_headers'), 'utf8');
let rules = template.replace('__JSON_LD_SCRIPT_HASHES__', [...hashes].sort().join(' '));
if (noindexDeployment) rules = rules.replace('/*\n', '/*\n  X-Robots-Tag: noindex, nofollow\n');
if (rules.includes('__JSON_LD_SCRIPT_HASHES__')) throw Error('CSP template could not be generated');
fs.writeFileSync(path.join(output, '_headers'), rules);
console.log(`Built dist/ for ${siteUrl} with ${hashes.size} CSP hash(es)${noindexDeployment ? ", noindex" : ""}`);
