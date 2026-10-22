import { createClient } from '@supabase/supabase-js';

const base = (process.env.TEST_BASE_URL || 'https://achola-odhiambo-advocates.pages.dev').replace(/\/$/, '');
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!email || !password) throw new Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD are required.');
const config = await (await fetch(`${base}/api/config`)).json();
const client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: { persistSession: false } });
const { data: login, error: loginError } = await client.auth.signInWithPassword({ email, password });
if (loginError) throw loginError;
const folder = login.user.id;
const { data: articles, error: articleError } = await client.from('articles').select('cover_image_url');
if (articleError) throw articleError;
const marker = '/storage/v1/object/public/article-images/';
const referenced = new Set((articles || []).map(article => {
  try { return decodeURIComponent(new URL(article.cover_image_url).pathname.split(marker)[1] || ''); }
  catch { return ''; }
}));
const { data: objects, error: listError } = await client.storage.from('article-images').list(folder, { limit: 1000 });
if (listError) throw listError;
const orphaned = (objects || []).map(object => `${folder}/${object.name}`).filter(path => !referenced.has(path));
if (orphaned.length) {
  const { error } = await client.storage.from('article-images').remove(orphaned);
  if (error) throw error;
}
await client.auth.signOut();
console.log(JSON.stringify({ removed: orphaned.length }));
