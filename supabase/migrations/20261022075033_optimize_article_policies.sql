drop policy "Anyone can read published articles" on public.articles;
create policy "Anyone can read published articles" on public.articles for select to anon using (status = 'published');
create index articles_created_by_idx on public.articles (created_by);
