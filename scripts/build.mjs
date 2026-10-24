import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { build as bundle } from 'esbuild';

const src = path.resolve('site');
const out = path.resolve('dist');
const articlesDir = path.resolve('content/articles');
const sourceSite = 'https://achola-odhiambo-advocates.vercel.app';
const defaultSite = 'https://achola-odhiambo-advocates.pages.dev';
function canonicalOrigin(value) {
  if (!value) return defaultSite;
  let url;
  try { url = new URL(value); } catch { throw Error('SITE_URL must be an absolute https:// URL'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.search || url.hash || url.port || (url.pathname !== '/' && url.pathname !== '')) {
    throw Error('SITE_URL must be an HTTPS origin without a path, query or fragment');
  }
  return url.origin;
}
const siteUrl = canonicalOrigin(process.env.SITE_URL?.trim());

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function parseArticle(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file}: article must begin with YAML-style front matter`);
  const metadata = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator < 1) throw new Error(`${file}: invalid front matter line: ${line}`);
    const key = line.slice(0, separator).trim();
    metadata[key] = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  const slug = path.basename(file, '.md');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: filename must contain only lowercase words separated by hyphens`);
  for (const field of ['title', 'description', 'date', 'category', 'author', 'image', 'imageAlt']) {
    if (!metadata[field]) throw new Error(`${file}: missing required field "${field}"`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date) || Number.isNaN(Date.parse(`${metadata.date}T00:00:00Z`))) {
    throw new Error(`${file}: date must use YYYY-MM-DD`);
  }
  if (!/^\/[a-zA-Z0-9/_\-.]+$/.test(metadata.image)) throw new Error(`${file}: image must be a local root-relative path`);
  if (!fs.existsSync(path.join(src, metadata.image.slice(1)))) throw new Error(`${file}: image not found: ${metadata.image}`);
  const body = match[2].trim();
  if (!body) throw new Error(`${file}: article body cannot be empty`);
  return { ...metadata, slug, body };
}

function inlineMarkdown(value) {
  let text = escapeHtml(value);
  text = text.replace(/!\[([^\]]*)\]\((\/[a-zA-Z0-9/_\-.]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
  return text;
}

function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const output = [];
  let paragraph = [];
  let listType = null;
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = null;
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); closeList(); continue; }
    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const quote = line.match(/^>\s?(.+)$/);
    if (heading) {
      flushParagraph(); closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (unordered || ordered) {
      flushParagraph();
      const type = unordered ? 'ul' : 'ol';
      if (listType !== type) { closeList(); output.push(`<${type}>`); listType = type; }
      output.push(`<li>${inlineMarkdown((unordered || ordered)[1])}</li>`);
    } else if (quote) {
      flushParagraph(); closeList(); output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
    } else if (/^---+$/.test(line)) {
      flushParagraph(); closeList(); output.push('<hr>');
    } else {
      closeList(); paragraph.push(line);
    }
  }
  flushParagraph(); closeList();
  return output.join('\n');
}

const formatDate = date => new Intl.DateTimeFormat('en-KE', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
}).format(new Date(`${date}T00:00:00Z`));

const readTime = body => Math.max(1, Math.ceil(body.split(/\s+/).length / 210));
const articleFiles = fs.existsSync(articlesDir) ? fs.readdirSync(articlesDir).filter(file => file.endsWith('.md')).sort() : [];
const articles = articleFiles.map(file => parseArticle(path.join(articlesDir, file))).sort((a, b) => b.date.localeCompare(a.date));

if (!articles.length) throw new Error('At least one article is required in content/articles/');
if (new Set(articles.map(article => article.slug)).size !== articles.length) throw new Error('Article slugs must be unique');

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });

const insightsPath = path.join(out, 'insights.html');
let insights = fs.readFileSync(insightsPath, 'utf8');
const cards = articles.map(article => `<article class="insight-card reveal"><a class="insight-card-image" href="/insights/${article.slug}"><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt)}" loading="lazy"></a><div class="insight-card-copy"><div class="article-meta"><span>${escapeHtml(article.category)}</span><time datetime="${article.date}">${formatDate(article.date)}</time></div><h2><a href="/insights/${article.slug}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.description)}</p><a class="text-link" href="/insights/${article.slug}">Read article <span aria-hidden="true">→</span></a></div></article>`).join('');

insights = insights.replace(
  /<section class="section"><div class="container insight-list">[\s\S]*?<\/div><\/section>/,
  `<section class="section"><div class="container"><div class="insights-heading"><p class="eyebrow">Latest articles</p><p data-insights-count>${articles.length} article${articles.length === 1 ? '' : 's'} from our legal team.</p></div><div class="insight-list" data-insights-list>${cards}</div></div></section>`
);
insights = insights.replace('</body>', '<script type="module" src="/assets/js/insights.js?v=2"></script></body>');
fs.writeFileSync(insightsPath, insights);

const shell = fs.readFileSync(path.join(src, 'insights.html'), 'utf8');
const headerAndRail = shell.match(/(<header class="site-header"[\s\S]*?<\/header><aside[\s\S]*?<\/aside>)/)?.[0];
const footerAndScript = shell.match(/(<footer class="site-footer"[\s\S]*?<\/body><\/html>)/)?.[0];
if (!headerAndRail || !footerAndScript) throw new Error('Could not extract shared site chrome from site/insights.html');

const sitemapPath = path.join(out, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
const articleUrls = articles.map(article => `  <url><loc>${siteUrl}/insights/${article.slug}</loc><lastmod>${article.date}</lastmod><changefreq>yearly</changefreq><priority>0.7</priority></url>`).join('\n');
sitemap = sitemap.replace('</urlset>', `${articleUrls}\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap);
fs.rmSync(sitemapPath);

await Promise.all([
  bundle({ entryPoints: ['src/admin.js'], bundle: true, minify: true, format: 'esm', target: 'es2020', outfile: path.join(out, 'assets/js/admin.js') }),
  bundle({ entryPoints: ['src/insights.js'], bundle: true, minify: true, format: 'esm', target: 'es2020', outfile: path.join(out, 'assets/js/insights.js') }),
  bundle({ entryPoints: ['src/site-content.js'], bundle: true, minify: true, format: 'iife', target: 'es2020', outfile: path.join(out, 'assets/js/site-content.js') })
]);
for (const bundleFile of ['admin.js', 'insights.js', 'site-content.js']) {
  const filename = path.join(out, 'assets/js', bundleFile);
  const source = fs.readFileSync(filename, 'utf8').replace(/[ \t]+$/gm, '').trimEnd();
  fs.writeFileSync(filename, `${source}\n`);
}

for (const filename of fs.readdirSync(out).filter(name => name.endsWith('.html')).map(name => path.join(out, name))) {
  const page = fs.readFileSync(filename, 'utf8');
  fs.writeFileSync(filename, page.replace('</body>', '<script src="/assets/js/site-content.js?v=1" defer></script></body>'));
}

const builtPages = fs.readdirSync(out).filter(name => name.endsWith('.html')).map(name => path.join(out, name));
builtPages.push(path.join(out, 'admin/index.html'));
for (const filename of [...builtPages, path.join(out, 'robots.txt')]) {
  const contents = fs.readFileSync(filename, 'utf8');
  fs.writeFileSync(filename, contents.replaceAll(sourceSite, siteUrl));
}

const hashes = new Set();
for (const filename of builtPages) {
  const page = fs.readFileSync(filename, 'utf8');
  for (const match of page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[0].includes(' src=')) continue;
    if (!/^<script\s+type="application\/ld\+json">/.test(match[0])) throw Error(`Unexpected inline script in ${filename}`);
    hashes.add(`'sha256-${crypto.createHash('sha256').update(match[1]).digest('base64')}'`);
  }
}
const headerTemplate = fs.readFileSync(path.join(src, '_headers'), 'utf8');
fs.writeFileSync(path.join(out, '_headers'), headerTemplate.replace('__JSON_LD_SCRIPT_HASHES__', [...hashes].sort().join(' ')));

console.log(`Built dist/ with ${articles.length} article${articles.length === 1 ? '' : 's'} and ${hashes.size} CSP hash(es).`);
