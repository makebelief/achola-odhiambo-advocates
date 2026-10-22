import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createClient } from '@supabase/supabase-js';

const base = (process.env.TEST_BASE_URL || 'https://achola-odhiambo-advocates.pages.dev').replace(/\/$/, '');
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.');
const slug = `production-check-${Date.now()}`;
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
let created = false;
let adminClient;
let initialImageCount = 0;
let publicPage;

const setArticleBody = () => page.locator('[data-body-editor]').evaluate(element => {
  element.innerHTML = '<h2>Verified heading</h2><p>This paragraph verifies article publishing.</p><ul><li>Verified list item</li></ul><p><a href="https://example.com">Verified link</a></p>';
});

const removeArticle = async articleSlug => {
  if (!adminClient) return;
  const { data: rows } = await adminClient.from('articles').select('cover_image_url').eq('slug', articleSlug);
  const { error } = await adminClient.from('articles').delete().eq('slug', articleSlug);
  if (error) throw error;
  for (const row of rows || []) {
    const marker = '/storage/v1/object/public/article-images/';
    const path = decodeURIComponent(new URL(row.cover_image_url).pathname.split(marker)[1] || '');
    if (path) await adminClient.storage.from('article-images').remove([path]);
  }
};

const fillArticle = async articleSlug => {
  await page.locator('[name="title"]').fill('Production readiness check');
  await page.locator('[name="category"]').fill('Legal updates');
  await page.locator('[name="description"]').fill('A disposable article used to verify the complete production publishing workflow safely.');
  await page.locator('[name="slug"]').fill(articleSlug);
  await page.locator('[name="image_alt"]').fill('A lawyer reviewing a legal document in an office');
  await page.locator('[name="cover_image"]').setInputFiles('site/assets/media/divorce-consultation-social.jpg');
  await setArticleBody();
};

try {
  const configResponse = await page.request.get(`${base}/api/config`);
  assert.equal(configResponse.status(), 200, 'public configuration endpoint');
  const config = await configResponse.json();
  assert.match(config.supabaseUrl, /^https:\/\/.+\.supabase\.co$/);
  assert.ok(config.supabasePublishableKey);
  adminClient = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: false } });
  const { error: adminLoginError } = await adminClient.auth.signInWithPassword({ email, password });
  assert.equal(adminLoginError, null, 'test cleanup authentication');
  const { data: staleArticles } = await adminClient.from('articles').select('slug').like('slug', 'production-check-%');
  for (const article of staleArticles || []) await removeArticle(article.slug);
  const { data: initialImages } = await adminClient.storage.from('article-images').list((await adminClient.auth.getUser()).data.user.id, { limit: 1000 });
  initialImageCount = initialImages?.length || 0;

  await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill('intentionally-wrong-password');
  await page.locator('[data-login-form] button').click();
  await page.waitForFunction(() => document.querySelector('[data-login-message]')?.textContent.includes('incorrect'));
  await page.locator('[name="password"]').fill(password);
  await page.locator('[data-login-form] button').click();
  await page.waitForSelector('[data-dashboard]:not([hidden])');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-dashboard]:not([hidden])');

  await page.locator('[data-new-article]').click();
  await fillArticle(slug);
  await page.locator('[data-body-editor]').evaluate(element => { element.innerHTML = ''; });
  await page.locator('[data-save-draft]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent.includes('write some article content'));
  await setArticleBody();
  await page.locator('[name="cover_image"]').setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await page.locator('[data-save-draft]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent.includes('JPG, PNG or WebP'));
  await page.locator('[name="cover_image"]').setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc((5 * 1024 * 1024) + 1) });
  await page.locator('[data-save-draft]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent.includes('smaller than 5 MB'));
  await page.locator('[name="cover_image"]').setInputFiles('site/assets/media/divorce-consultation-social.jpg');
  await page.locator('[data-save-draft]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent === 'Draft saved.');
  created = true;
  let publicList = await (await page.request.get(`${base}/api/articles`)).json();
  assert.equal(publicList.articles.some(article => article.slug === slug), false, 'draft must not be public');
  assert.equal((await page.request.get(`${base}/insights/${slug}`)).status(), 404, 'draft direct URL');
  publicPage = await context.newPage();
  await publicPage.goto(`${base}/insights`, { waitUntil: 'networkidle' });
  assert.equal(await publicPage.locator(`a[href="/insights/${slug}"]`).count(), 0, 'draft card must not be rendered');

  await page.locator('[data-publish]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent === 'Article published successfully.');
  assert.equal(await page.locator('[name="slug"]').isEditable(), false, 'published slug is locked');
  await publicPage.locator(`a[href="/insights/${slug}"]`).first().waitFor({ state: 'visible', timeout: 10000 });
  publicList = await (await page.request.get(`${base}/api/articles`)).json();
  assert.equal(publicList.articles.some(article => article.slug === slug), true, 'published article listing');
  const articleResponse = await page.request.get(`${base}/insights/${slug}`);
  assert.equal(articleResponse.status(), 200, 'published direct URL');
  assert.match(articleResponse.headers()['cache-control'], /no-store/);
  const articleHtml = await articleResponse.text();
  assert.match(articleHtml, /Production readiness check/);
  assert.match(articleHtml, /property="og:image" content="https:\/\//);
  assert.match(articleHtml, /application\/ld\+json/);
  assert.match(articleHtml, /Verified list item/);
  assert.match(articleHtml, /data-copy-link=/);
  await page.goto(`${base}/insights`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator(`a[href="/insights/${slug}"]`).count() > 0, true, 'published card rendered on Insights page');
  await page.goto(`${base}/admin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-dashboard]:not([hidden])');
  await page.locator('[data-article-list] button', { hasText: 'Production readiness check' }).first().click();
  const sitemap = await page.request.get(`${base}/sitemap.xml`);
  assert.equal(sitemap.status(), 200, 'dynamic sitemap');
  assert.match(await sitemap.text(), new RegExp(`/insights/${slug}`));

  await page.locator('[data-new-article]').click();
  await fillArticle(slug);
  await page.locator('[data-save-draft]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent.includes('already in use'));

  await page.locator('[data-article-list] button', { hasText: 'Production readiness check' }).first().click();
  await page.locator('[data-save-draft]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent === 'Draft saved.');
  await publicPage.locator(`a[href="/insights/${slug}"]`).first().waitFor({ state: 'detached', timeout: 20000 });
  assert.equal((await page.request.get(`${base}/insights/${slug}`)).status(), 404, 'unpublished direct URL');
  publicList = await (await page.request.get(`${base}/api/articles`)).json();
  assert.equal(publicList.articles.some(article => article.slug === slug), false, 'unpublished listing');

  await page.locator('[data-publish]').click();
  await page.waitForFunction(() => document.querySelector('[data-save-message]')?.textContent === 'Article published successfully.');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-delete]').click();
  await page.waitForFunction(() => document.querySelector('[data-article-form]').hidden);
  created = false;
  assert.equal((await page.request.get(`${base}/insights/${slug}`)).status(), 404, 'deleted direct URL');
  publicList = await (await page.request.get(`${base}/api/articles`)).json();
  assert.equal(publicList.articles.some(article => article.slug === slug), false, 'deleted listing');

  const anonHeaders = { apikey: config.supabasePublishableKey, 'Content-Type': 'application/json' };
  const anonInsert = await page.request.post(`${config.supabaseUrl}/rest/v1/articles`, { headers: anonHeaders, data: { slug: `${slug}-unauthorised`, title: 'Unauthorised article', description: 'This unauthorised record must always be rejected by row-level security.', category: 'Security', author_name: 'Attacker', cover_image_url: 'https://example.com/image.jpg', image_alt: 'Test', body_html: '<p>This must never be inserted.</p>', status: 'draft' } });
  assert.ok([401, 403].includes(anonInsert.status()), `anonymous insert returned ${anonInsert.status()}`);
  const anonClient = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: false } });
  const { error: anonUploadError } = await anonClient.storage.from('article-images').upload(`unauthorised/${slug}.png`, new Blob(['not an image'], { type: 'image/png' }));
  assert.ok(anonUploadError, 'anonymous image upload must be rejected');
  assert.equal((await page.request.get(`${base}/api/article?slug=../invalid`)).status(), 404, 'invalid slug is rejected');
  const userId = (await adminClient.auth.getUser()).data.user.id;
  const { data: finalImages } = await adminClient.storage.from('article-images').list(userId, { limit: 1000 });
  assert.equal(finalImages?.length || 0, initialImageCount, 'test images and failed duplicate uploads are cleaned up');
  await page.locator('[data-sign-out]').click();
  await page.waitForSelector('[data-login-view]:not([hidden])');
  console.log(JSON.stringify({ ok: true, slug, checks: 33 }));
} finally {
  if (created) await removeArticle(slug);
  await browser.close();
}
