alter table public.articles drop constraint articles_body_html_check;
alter table public.articles add constraint articles_body_html_check check (char_length(trim(body_html)) > 0);
