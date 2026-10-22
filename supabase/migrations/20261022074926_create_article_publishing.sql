create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
create policy "Administrators can verify their own access" on public.admin_users for select to authenticated using ((select auth.uid()) = user_id);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 3 and 140),
  description text not null check (char_length(description) between 20 and 220),
  category text not null check (char_length(category) between 2 and 60),
  author_name text not null check (char_length(author_name) between 2 and 100),
  cover_image_url text not null check (cover_image_url ~ '^https://'),
  image_alt text,
  body_html text not null check (char_length(body_html) > 20),
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft') or (published_at is not null))
);

create index articles_public_listing_idx on public.articles (status, published_at desc);
alter table public.articles enable row level security;

create policy "Anyone can read published articles" on public.articles for select to anon, authenticated using (status = 'published');
create policy "Administrators can read all articles" on public.articles for select to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "Administrators can create articles" on public.articles for insert to authenticated with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())) and created_by = (select auth.uid()));
create policy "Administrators can update articles" on public.articles for update to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid()))) with check (exists (select 1 from public.admin_users where user_id = (select auth.uid())) and created_by = (select auth.uid()));
create policy "Administrators can delete articles" on public.articles for delete to authenticated using (exists (select 1 from public.admin_users where user_id = (select auth.uid())));

grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;
grant select on public.admin_users to authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create trigger articles_set_updated_at before update on public.articles for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('article-images', 'article-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Administrators can upload article images" on storage.objects for insert to authenticated with check (bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "Administrators can view article image records" on storage.objects for select to authenticated using (bucket_id = 'article-images' and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "Administrators can update article images" on storage.objects for update to authenticated using (bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.admin_users where user_id = (select auth.uid()))) with check (bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Administrators can delete article images" on storage.objects for delete to authenticated using (bucket_id = 'article-images' and (storage.foldername(name))[1] = (select auth.uid())::text and exists (select 1 from public.admin_users where user_id = (select auth.uid())));

insert into public.articles (slug,title,description,category,author_name,cover_image_url,image_alt,body_html,status,published_at)
values ('before-filing-for-divorce-in-kenya','Before filing for divorce in Kenya','A practical starting checklist for organising the documents, questions and decisions that may matter before divorce proceedings begin.','Family law','Achola Odhiambo','https://achola-odhiambo-advocates.vercel.app/assets/media/divorce-consultation-social.jpg','A private legal consultation in a professional office','<p>When a marriage has broken down, taking time to organise the relevant information can make the initial legal consultation more focused.</p><h2>Identify the type of marriage</h2><p>Establish how the marriage was celebrated and registered. If available, locate the marriage certificate or other relevant records.</p><h2>Gather the core documents</h2><ul><li>Identification documents and the marriage certificate</li><li>Birth certificates for any children</li><li>Relevant correspondence between the spouses</li><li>Property and financial records</li></ul><h2>Get advice before taking irreversible steps</h2><p>Early advice can help you understand the available process, likely timelines and immediate safeguards.</p>','published','2026-10-22T09:00:00+03:00')
on conflict (slug) do nothing;
