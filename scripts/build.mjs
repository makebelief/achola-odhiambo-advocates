import fs from 'node:fs';
import path from 'node:path';
import { build as bundle } from 'esbuild';

const src = path.resolve('site');
const out = path.resolve('dist');
const articlesDir = path.resolve('content/articles');
const siteUrl = (process.env.SITE_URL || 'https://achola-odhiambo-advocates.vercel.app').replace(/\/$/, '');

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
insights = insights.replace('</body>', '<script type="module" src="/assets/js/insights.js?v=1"></script></body>');
fs.writeFileSync(insightsPath, insights);

const shell = fs.readFileSync(path.join(src, 'insights.html'), 'utf8');
const headerAndRail = shell.match(/(<header class="site-header"[\s\S]*?<\/header><aside[\s\S]*?<\/aside>)/)?.[0];
const footerAndScript = shell.match(/(<footer class="site-footer"[\s\S]*?<\/body><\/html>)/)?.[0];
if (!headerAndRail || !footerAndScript) throw new Error('Could not extract shared site chrome from site/insights.html');

for (const article of articles) {
  const canonical = `${siteUrl}/insights/${article.slug}`;
  const imageUrl = `${siteUrl}${article.image}`;
  const title = `${article.title} | Achola Odhiambo & Company Advocates`;
  const articleJsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
    description: article.description, image: [imageUrl], datePublished: article.date,
    author: { '@type': 'Person', name: article.author },
    publisher: { '@type': 'Organization', name: 'Achola Odhiambo & Company Advocates', url: siteUrl },
    mainEntityOfPage: canonical
  }).replaceAll('<', '\\u003c');
  const html = `<!doctype html><html lang="en-KE"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(article.description)}"><link rel="canonical" href="${canonical}"><meta name="theme-color" content="#0b0c0f"><meta property="og:type" content="article"><meta property="og:site_name" content="Achola Odhiambo & Company Advocates"><meta property="og:title" content="${escapeHtml(article.title)}"><meta property="og:description" content="${escapeHtml(article.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${imageUrl}"><meta property="og:image:alt" content="${escapeHtml(article.imageAlt)}"><meta property="article:published_time" content="${article.date}T00:00:00+03:00"><meta property="article:author" content="${escapeHtml(article.author)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(article.title)}"><meta name="twitter:description" content="${escapeHtml(article.description)}"><meta name="twitter:image" content="${imageUrl}"><link rel="icon" type="image/svg+xml" href="/images/favicon.svg"><link rel="stylesheet" href="/assets/css/site.css?v=5"><script type="application/ld+json">${articleJsonLd}</script></head><body><a class="skip-link" href="#main-content">Skip to content</a>${headerAndRail}<main id="main-content"><article class="article-page"><header class="article-hero"><div class="article-hero-copy"><a class="article-back" href="/insights">← All insights</a><p class="eyebrow">${escapeHtml(article.category)}</p><h1>${escapeHtml(article.title)}</h1><p class="article-deck">${escapeHtml(article.description)}</p><div class="article-byline"><span>By ${escapeHtml(article.author)}</span><time datetime="${article.date}">${formatDate(article.date)}</time><span>${readTime(article.body)} min read</span></div></div><figure><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt)}"></figure></header><div class="article-layout container"><div class="article-share" aria-label="Share this article"><span>Share</span><a href="https://wa.me/?text=${encodeURIComponent(`${article.title} ${canonical}`)}" target="_blank" rel="noopener" aria-label="Share on WhatsApp">WhatsApp</a><a href="mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(canonical)}" aria-label="Share by email">Email</a><button type="button" data-copy-link="${canonical}">Copy link</button><span class="copy-status" role="status" aria-live="polite"></span></div><div class="article-body">${markdownToHtml(article.body)}<aside class="article-disclaimer"><strong>Legal notice</strong><p>This article provides general information only. It is not legal advice and does not create an advocate-client relationship. Please seek advice on your specific circumstances.</p></aside></div></div></article><section class="article-cta"><div><p class="eyebrow light">Speak with counsel</p><h2>Need advice on your specific circumstances?</h2></div><a class="button button-gold" href="/contact">Discuss your matter <span aria-hidden="true">↗</span></a></section></main>${footerAndScript}`;
  const articleDir = path.join(out, 'insights', article.slug);
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(path.join(articleDir, 'index.html'), html);
}

const sitemapPath = path.join(out, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
const articleUrls = articles.map(article => `  <url><loc>${siteUrl}/insights/${article.slug}</loc><lastmod>${article.date}</lastmod><changefreq>yearly</changefreq><priority>0.7</priority></url>`).join('\n');
sitemap = sitemap.replace('</urlset>', `${articleUrls}\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap);

await Promise.all([
  bundle({ entryPoints: ['src/admin.js'], bundle: true, minify: true, format: 'esm', target: 'es2020', outfile: path.join(out, 'assets/js/admin.js') }),
  bundle({ entryPoints: ['src/insights.js'], bundle: true, minify: true, format: 'esm', target: 'es2020', outfile: path.join(out, 'assets/js/insights.js') })
]);

console.log(`Built dist/ with ${articles.length} article${articles.length === 1 ? '' : 's'}.`);
