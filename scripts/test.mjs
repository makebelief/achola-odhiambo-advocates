import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

function must(condition, message) { if (!condition) throw Error(message); }
function build(url) {
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], { encoding: 'utf8', env: { ...process.env, ...(url ? {SITE_URL: url} : {SITE_URL: ''}) } });
  must(result.status === 0, `Build failed: ${result.stderr}`);
}
function verify(url) {
  const out = path.resolve('dist');
  const csp = fs.readFileSync(path.join(out, '_headers'), 'utf8');
  must(!csp.includes('__JSON_LD_SCRIPT_HASHES__'), 'CSP placeholder survived');
  must(csp.includes("frame-ancestors 'none'") && csp.includes("script-src 'self'"), 'Security CSP missing');
  must(fs.readFileSync(path.join(out, 'robots.txt'), 'utf8').includes(`${url}/sitemap.xml`), 'robots.txt domain incorrect');
  const files = fs.readdirSync(out).filter(name => name.endsWith('.html'));
  for (const file of files) {
    const page = fs.readFileSync(path.join(out, file), 'utf8');
    must(page.includes(`rel="canonical" href="${url}`), `${file} domain incorrect`);
    // WhatsApp, Facebook, LinkedIn and other crawlers fetch these HTML tags;
    // JavaScript-generated metadata would not work for preview bots.
    const previewUrl = `${url}/images/social-card-v2.jpg`;
    must(page.includes(`property="og:image" content="${previewUrl}"`), `${file} OG preview domain or path incorrect`);
    must(page.includes(`property="og:image:secure_url" content="${previewUrl}"`), `${file} OG secure preview missing`);
    must(page.includes('property="og:image:width" content="1200"') && page.includes('property="og:image:height" content="630"'), `${file} preview dimensions missing`);
    must(page.includes('property="og:image:alt"'), `${file} OG image alt text missing`);
    if (!['404.html', '500.html', '503.html', '504.html'].includes(file)) {
      must(page.includes(`name="twitter:image" content="${previewUrl}"`), `${file} Twitter preview image missing`);
      must(page.includes('name="twitter:image:alt"'), `${file} Twitter preview alt text missing`);
    }

    for (const match of page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const hash = crypto.createHash('sha256').update(match[1]).digest('base64');
      must(csp.includes(`'sha256-${hash}'`), `${file} has missing CSP hash`);
      must(JSON.parse(match[1])['@context'] === 'https://schema.org', `${file} schema invalid`);
    }
  }
  must(!csp.includes('unsafe-inline') && !csp.includes('unsafe-eval'), 'CSP allows executable inline scripts');
  must(fs.existsSync(path.join(out, 'assets/js/site.js')), 'Compiled JS missing');
  const preview = fs.readFileSync(path.join(out, 'images/social-card-v2.jpg'));
  must(preview.length > 10000 && preview.length < 500000 && preview[0] === 0xff && preview[1] === 0xd8,
    'OG image must be an optimized JPEG below 500 KB');

}
const check = spawnSync(process.execPath, ['scripts/check.mjs'], { encoding: 'utf8' });
must(check.status === 0, check.stderr);
build('https://example.co.ke');
verify('https://example.co.ke');
let bad = spawnSync(process.execPath, ['scripts/build.mjs'], { encoding:'utf8', env:{...process.env,SITE_URL:'http://insecure.example.org'} });
must(bad.status !== 0, 'Insecure URL was accepted');
build();
verify('https://achola-odhiambo-advocates.vercel.app');
console.log('Production tests passed: SEO domain replacement, CSP integrity, assets, secure URL validation and demo fallback.');
