import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const required = ['index.html', 'about.html', 'practice-areas.html', 'managing-partner.html', 'insights.html', 'contact.html', 'privacy.html', 'terms.html', 'legal-notice.html', '404.html', '500.html', '503.html', '504.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest', 'assets/css/site.css', 'assets/js/site.js', 'assets/media/logo-dark.svg', 'assets/media/logo-light.svg'];
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
  if (!source.includes('viewport-fit=cover')) errors.push(`${label} missing responsive viewport`);
  for (const match of source.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const url = match[1].split(/[?#]/)[0];
    if (url === '/' || url.startsWith('//')) continue;
    if (url.startsWith('/assets/') || url.startsWith('/images/') || ['/site.webmanifest', '/robots.txt', '/sitemap.xml'].includes(url)) {
      if (!fs.existsSync(path.join(dist, url.slice(1)))) errors.push(`${label} missing asset ${url}`);
    } else {
      const htmlFile = path.join(dist, `${url.slice(1)}.html`);
      const indexFile = path.join(dist, url.slice(1), 'index.html');
      if (!fs.existsSync(htmlFile) && !fs.existsSync(indexFile)) errors.push(`${label} broken link ${url}`);
    }
  }
}

const articleFiles = fs.readdirSync(path.resolve('content/articles')).filter(file => file.endsWith('.md'));
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const insights = fs.readFileSync(path.join(dist, 'insights.html'), 'utf8');
for (const articleFile of articleFiles) {
  const slug = path.basename(articleFile, '.md');
  const output = path.join(dist, 'insights', slug, 'index.html');
  if (!fs.existsSync(output)) { errors.push(`Article not generated: ${slug}`); continue; }
  const source = fs.readFileSync(output, 'utf8');
  for (const marker of ['property="og:type" content="article"', 'property="og:image"', 'application/ld+json', 'data-copy-link=']) {
    if (!source.includes(marker)) errors.push(`${slug} missing ${marker}`);
  }
  if (!insights.includes(`href="/insights/${slug}"`)) errors.push(`${slug} missing from Insights listing`);
  if (!sitemap.includes(`/insights/${slug}`)) errors.push(`${slug} missing from sitemap`);
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Checks passed: ${html.length} generated HTML pages, ${articleFiles.length} article, required assets, metadata and internal links valid.`);
