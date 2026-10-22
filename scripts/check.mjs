import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const required = ['index.html', 'about.html', 'practice-areas.html', 'managing-partner.html', 'insights.html', 'contact.html', 'privacy.html', 'terms.html', 'legal-notice.html', 'admin/index.html', '404.html', '500.html', '503.html', '504.html', 'robots.txt', 'site.webmanifest', '_headers', 'images/social-card-v2.jpg', 'assets/css/site.css', 'assets/css/admin.css', 'assets/js/site.js', 'assets/js/admin.js', 'assets/js/insights.js', 'assets/media/logo-dark.svg', 'assets/media/logo-light.svg'];
const errors = [];

for (const file of required) if (!fs.existsSync(path.join(dist, file))) errors.push(`Missing generated file: ${file}`);

const html = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith('.html')) html.push(file);
  }
}
walk(dist);

for (const file of html) {
  const source = fs.readFileSync(file, 'utf8');
  const label = path.relative(dist, file);
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(source)) errors.push(`${label} contains merge-conflict markers`);
  if (!source.includes('viewport-fit=cover')) errors.push(`${label} missing responsive viewport`);
  for (const match of source.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (url === '/' || url.startsWith('//')) continue;
    if (/^\/insights\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url)) continue;
    if (url === '/sitemap.xml') continue;
    if (url.startsWith('/assets/') || url.startsWith('/images/') || ['/site.webmanifest', '/robots.txt'].includes(url)) {
      if (!fs.existsSync(path.join(dist, url.slice(1)))) errors.push(`${label} missing asset ${url}`);
    } else {
      const htmlFile = path.join(dist, `${url.slice(1)}.html`);
      const indexFile = path.join(dist, url.slice(1), 'index.html');
      if (!fs.existsSync(htmlFile) && !fs.existsSync(indexFile)) errors.push(`${label} broken link ${url}`);
    }
  }
}

const articleFiles = fs.readdirSync(path.resolve('content/articles')).filter(file => file.endsWith('.md'));
const insights = fs.readFileSync(path.join(dist, 'insights.html'), 'utf8');
for (const articleFile of articleFiles) {
  const slug = path.basename(articleFile, '.md');
  if (!insights.includes(`href="/insights/${slug}"`)) errors.push(`${slug} missing from Insights listing`);
}

const admin = fs.readFileSync(path.join(dist, 'admin/index.html'), 'utf8');
for (const marker of ['data-login-form', 'data-article-form', 'data-publish', '/assets/js/admin.js']) {
  if (!admin.includes(marker)) errors.push(`Admin dashboard missing ${marker}`);
}
if (!insights.includes('data-insights-list') || !insights.includes('/assets/js/insights.js')) errors.push('Insights page missing dynamic article integration');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Checks passed: ${html.length} generated HTML pages, ${articleFiles.length} article, required assets, metadata and internal links valid.`);
