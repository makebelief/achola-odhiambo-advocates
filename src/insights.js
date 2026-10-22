import { createClient } from '@supabase/supabase-js';

const list = document.querySelector('[data-insights-list]');
const count = document.querySelector('[data-insights-count]');
let signature = '';
let refreshInProgress = false;

function renderArticles(articles) {
  const nextSignature = JSON.stringify(articles);
  if (nextSignature === signature) return;
  signature = nextSignature;
  list.replaceChildren();
  count.textContent = `${articles.length} article${articles.length === 1 ? '' : 's'} from our legal team.`;
  if (!articles.length) {
    const empty = document.createElement('p');
    empty.textContent = 'New legal insights will be published here.';
    list.append(empty);
    return;
  }
  for (const article of articles) {
    const card = document.createElement('article'); card.className = 'insight-card reveal is-visible';
    const imageLink = document.createElement('a'); imageLink.className = 'insight-card-image'; imageLink.href = `/insights/${article.slug}`;
    const image = document.createElement('img'); image.src = article.cover_image_url; image.alt = article.image_alt || article.title; image.loading = 'lazy'; imageLink.append(image);
    const copy = document.createElement('div'); copy.className = 'insight-card-copy';
    const meta = document.createElement('div'); meta.className = 'article-meta';
    const category = document.createElement('span'); category.textContent = article.category;
    const time = document.createElement('time'); time.dateTime = article.published_at; time.textContent = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(article.published_at)); meta.append(category, time);
    const heading = document.createElement('h2'); const titleLink = document.createElement('a'); titleLink.href = `/insights/${article.slug}`; titleLink.textContent = article.title; heading.append(titleLink);
    const description = document.createElement('p'); description.textContent = article.description;
    const read = document.createElement('a'); read.className = 'text-link'; read.href = `/insights/${article.slug}`; read.textContent = 'Read article →';
    copy.append(meta, heading, description, read); card.append(imageLink, copy); list.append(card);
  }
}

async function refreshArticles() {
  if (refreshInProgress) return;
  refreshInProgress = true;
  try {
    const response = await fetch('/api/articles', { cache: 'no-store' });
    if (!response.ok) throw new Error('Article refresh failed');
    const { articles } = await response.json();
    if (Array.isArray(articles)) renderArticles(articles);
  } catch {
    // Keep the last successfully rendered list when the visitor is temporarily offline.
  } finally { refreshInProgress = false; }
}

async function initialiseLiveArticles() {
  if (!list || !count) return;
  await refreshArticles();
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) throw new Error('Realtime configuration unavailable');
    const config = await response.json();
    const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    supabase.channel('public-article-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, refreshArticles)
      .subscribe();
  } catch {
    // The interval below still provides automatic updates if Realtime is unavailable.
  }
  // Realtime is normally immediate; polling guarantees convergence if a browser,
  // network or proxy delays/drops its WebSocket connection.
  setInterval(refreshArticles, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshArticles(); });
  window.addEventListener('focus', refreshArticles);
}

initialiseLiveArticles();
