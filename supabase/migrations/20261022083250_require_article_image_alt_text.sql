update public.articles
set image_alt = title
where image_alt is null or char_length(trim(image_alt)) < 3;

alter table public.articles
  alter column image_alt set not null,
  add constraint articles_image_alt_length_check
  check (char_length(trim(image_alt)) between 3 and 180);
