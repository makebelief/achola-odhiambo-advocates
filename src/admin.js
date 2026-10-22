import { createClient } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';

const loginView = document.querySelector('[data-login-view]');
const dashboard = document.querySelector('[data-dashboard]');
const loginForm = document.querySelector('[data-login-form]');
const loginMessage = document.querySelector('[data-login-message]');
const articleForm = document.querySelector('[data-article-form]');
const emptyEditor = document.querySelector('[data-empty-editor]');
const articleList = document.querySelector('[data-article-list]');
const bodyEditor = document.querySelector('[data-body-editor]');
const saveMessage = document.querySelector('[data-save-message]');
const coverPreview = document.querySelector('[data-cover-preview]');
let supabase;
let session;
let articles = [];

const showMessage = (element, message, error = false) => { element.textContent = message; element.classList.toggle('error', error); };
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
const today = () => new Date().toISOString().slice(0, 10);
const setBusy = busy => articleForm?.querySelectorAll('button').forEach(button => { button.disabled = busy; });

async function initialise() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('The publishing service has not been configured yet.');
    const config = await response.json();
    supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const { data } = await supabase.auth.getSession();
    if (data.session) await openDashboard(data.session);
    supabase.auth.onAuthStateChange((_event, nextSession) => { session = nextSession; });
  } catch (error) { showMessage(loginMessage, error.message, true); }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault(); showMessage(loginMessage, 'Signing in…');
  const fields = new FormData(loginForm);
  const { data, error } = await supabase.auth.signInWithPassword({ email: fields.get('email'), password: fields.get('password') });
  if (error) return showMessage(loginMessage, 'The email or password is incorrect.', true);
  await openDashboard(data.session);
});

async function openDashboard(nextSession) {
  session = nextSession;
  const { data: access, error } = await supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (error || !access) { await supabase.auth.signOut(); return showMessage(loginMessage, 'This account does not have publishing access.', true); }
  loginView.hidden = true; dashboard.hidden = false; await loadArticles();
}

async function loadArticles(selectId) {
  articleList.innerHTML = '<p>Loading articles…</p>';
  const { data, error } = await supabase.from('articles').select('*').order('updated_at', { ascending: false });
  if (error) { articleList.innerHTML = '<p>Articles could not be loaded.</p>'; return; }
  articles = data || []; renderList(selectId);
}

function renderList(selectId) {
  document.querySelector('[data-article-count]').textContent = `${articles.length} total`;
  articleList.replaceChildren();
  if (!articles.length) { articleList.innerHTML = '<p>No articles yet.</p>'; return; }
  for (const article of articles) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.id = article.id;
    if (article.id === selectId) button.classList.add('active');
    const title = document.createElement('strong'); title.textContent = article.title;
    const meta = document.createElement('span');
    const category = document.createElement('i'); category.textContent = article.category; category.style.fontStyle = 'normal';
    const status = document.createElement('i'); status.textContent = article.status; status.style.fontStyle = 'normal'; status.className = article.status === 'published' ? 'status-published' : '';
    meta.append(category, status); button.append(title, meta); button.addEventListener('click', () => editArticle(article.id)); articleList.append(button);
  }
}

function newArticle() {
  articleForm.reset(); articleForm.elements.id.value = ''; articleForm.elements.author_name.value = 'Achola Odhiambo'; articleForm.elements.published_date.value = today();
  bodyEditor.innerHTML = ''; coverPreview.hidden = true; articleForm.hidden = false; emptyEditor.hidden = true;
  document.querySelector('[data-editor-mode]').textContent = 'New article'; document.querySelector('[data-editor-title]').textContent = 'Untitled article'; document.querySelector('[data-delete]').hidden = true;
  renderList(); articleForm.elements.title.focus();
}

function editArticle(id) {
  const article = articles.find(item => item.id === id); if (!article) return;
  for (const field of ['id', 'title', 'category', 'description', 'author_name', 'slug', 'cover_image_url']) articleForm.elements[field].value = article[field] || '';
  articleForm.elements.published_date.value = (article.published_at || article.created_at).slice(0, 10);
  bodyEditor.innerHTML = DOMPurify.sanitize(article.body_html || '');
  coverPreview.src = article.cover_image_url; coverPreview.hidden = !article.cover_image_url;
  articleForm.hidden = false; emptyEditor.hidden = true; document.querySelector('[data-editor-mode]').textContent = article.status === 'published' ? 'Published article' : 'Draft article'; document.querySelector('[data-editor-title]').textContent = article.title; document.querySelector('[data-delete]').hidden = false;
  renderList(id);
}

articleForm.elements.title.addEventListener('input', event => {
  document.querySelector('[data-editor-title]').textContent = event.target.value || 'Untitled article';
  if (!articleForm.elements.id.value) articleForm.elements.slug.value = slugify(event.target.value);
});

document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => { bodyEditor.focus(); document.execCommand(button.dataset.command, false); }));
document.querySelectorAll('[data-block]').forEach(button => button.addEventListener('click', () => { bodyEditor.focus(); document.execCommand('formatBlock', false, button.dataset.block); }));
document.querySelector('[data-link]').addEventListener('click', () => { const url = prompt('Paste the full website address:'); if (url && /^https?:\/\//i.test(url)) document.execCommand('createLink', false, url); });

async function uploadCover() {
  const file = articleForm.elements.cover_image.files[0];
  if (!file) return articleForm.elements.cover_image_url.value;
  if (file.size > 5 * 1024 * 1024) throw new Error('The cover image must be smaller than 5 MB.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Please choose a JPG, PNG or WebP image.');
  const extension = file.name.split('.').pop().toLowerCase();
  const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('article-images').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('article-images').getPublicUrl(path).data.publicUrl;
}

async function saveArticle(status) {
  if (!articleForm.reportValidity()) return;
  const bodyHtml = DOMPurify.sanitize(bodyEditor.innerHTML, { ALLOWED_TAGS: ['p','br','h2','h3','strong','em','ul','ol','li','a','blockquote'], ALLOWED_ATTR: ['href','target','rel'] });
  if (!bodyEditor.textContent.trim()) return showMessage(saveMessage, 'Please write the article content.', true);
  setBusy(true); showMessage(saveMessage, status === 'published' ? 'Publishing…' : 'Saving draft…');
  try {
    const coverImageUrl = await uploadCover(); if (!coverImageUrl) throw new Error('Please upload a cover image.');
    const id = articleForm.elements.id.value;
    const article = { title: articleForm.elements.title.value.trim(), slug: articleForm.elements.slug.value.trim(), description: articleForm.elements.description.value.trim(), category: articleForm.elements.category.value.trim(), author_name: articleForm.elements.author_name.value.trim(), cover_image_url: coverImageUrl, body_html: bodyHtml, status, published_at: status === 'published' ? `${articleForm.elements.published_date.value}T09:00:00+03:00` : null, created_by: session.user.id };
    const query = id ? supabase.from('articles').update(article).eq('id', id) : supabase.from('articles').insert(article);
    const { data, error } = await query.select().single(); if (error) throw error;
    articleForm.elements.id.value = data.id; showMessage(saveMessage, status === 'published' ? 'Article published successfully.' : 'Draft saved.'); await loadArticles(data.id); editArticle(data.id);
  } catch (error) { showMessage(saveMessage, error.code === '23505' ? 'That article address is already in use. Choose a different one.' : error.message, true); }
  finally { setBusy(false); }
}

document.querySelector('[data-new-article]').addEventListener('click', newArticle);
document.querySelector('[data-save-draft]').addEventListener('click', () => saveArticle('draft'));
document.querySelector('[data-publish]').addEventListener('click', () => saveArticle('published'));
document.querySelector('[data-view-site]').addEventListener('click', () => window.open('/insights', '_blank', 'noopener'));
document.querySelector('[data-sign-out]').addEventListener('click', async () => { await supabase.auth.signOut(); location.reload(); });
document.querySelector('[data-delete]').addEventListener('click', async () => { const id = articleForm.elements.id.value; if (!id || !confirm('Delete this article permanently?')) return; setBusy(true); const { error } = await supabase.from('articles').delete().eq('id', id); setBusy(false); if (error) return showMessage(saveMessage, error.message, true); articleForm.hidden = true; emptyEditor.hidden = false; await loadArticles(); });
articleForm.elements.cover_image.addEventListener('change', event => { const file = event.target.files[0]; if (file) { coverPreview.src = URL.createObjectURL(file); coverPreview.hidden = false; } });

initialise();
