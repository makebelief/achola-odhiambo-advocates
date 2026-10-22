const list = document.querySelector('[data-insights-list]');
const count = document.querySelector('[data-insights-count]');
if (list) fetch('/api/articles').then(response => response.ok ? response.json() : Promise.reject()).then(({ articles }) => {
  if (!articles?.length) return;
  list.replaceChildren(); count.textContent = `${articles.length} article${articles.length === 1 ? '' : 's'} from our legal team.`;
  for (const article of articles) {
    const card = document.createElement('article'); card.className = 'insight-card reveal is-visible';
    const imageLink = document.createElement('a'); imageLink.className = 'insight-card-image'; imageLink.href = `/insights/${article.slug}`;
    const image = document.createElement('img'); image.src = article.cover_image_url; image.alt = article.image_alt || article.title; image.loading = 'lazy'; imageLink.append(image);
    const copy = document.createElement('div'); copy.className = 'insight-card-copy';
    const meta = document.createElement('div'); meta.className = 'article-meta'; const category = document.createElement('span'); category.textContent = article.category; const time = document.createElement('time'); time.dateTime = article.published_at; time.textContent = new Intl.DateTimeFormat('en-KE', { day:'numeric', month:'long', year:'numeric' }).format(new Date(article.published_at)); meta.append(category, time);
    const heading = document.createElement('h2'); const titleLink = document.createElement('a'); titleLink.href = `/insights/${article.slug}`; titleLink.textContent = article.title; heading.append(titleLink);
    const description = document.createElement('p'); description.textContent = article.description;
    const read = document.createElement('a'); read.className = 'text-link'; read.href = `/insights/${article.slug}`; read.textContent = 'Read article →';
    copy.append(meta, heading, description, read); card.append(imageLink, copy); list.append(card);
  }
}).catch(() => {});
