create table public.site_content (
  id smallint primary key default 1 check (id = 1),
  home_heading text not null check (char_length(home_heading) between 2 and 100),
  home_highlight text not null check (char_length(home_highlight) between 2 and 100),
  home_description text not null check (char_length(home_description) between 10 and 320),
  about_heading text not null check (char_length(about_heading) between 2 and 100),
  about_highlight text not null check (char_length(about_highlight) between 2 and 100),
  about_description text not null check (char_length(about_description) between 10 and 320),
  practice_heading text not null check (char_length(practice_heading) between 2 and 100),
  practice_highlight text not null check (char_length(practice_highlight) between 2 and 100),
  practice_description text not null check (char_length(practice_description) between 10 and 320),
  partner_heading text not null check (char_length(partner_heading) between 2 and 100),
  partner_highlight text not null check (char_length(partner_highlight) between 2 and 100),
  partner_description text not null check (char_length(partner_description) between 10 and 320),
  insights_heading text not null check (char_length(insights_heading) between 2 and 100),
  insights_highlight text not null check (char_length(insights_highlight) between 2 and 100),
  insights_description text not null check (char_length(insights_description) between 10 and 320),
  contact_heading text not null check (char_length(contact_heading) between 2 and 100),
  contact_highlight text not null check (char_length(contact_highlight) between 2 and 100),
  contact_description text not null check (char_length(contact_description) between 10 and 320),
  phone_display text not null check (char_length(phone_display) between 7 and 32),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_number text not null check (whatsapp_number ~ '^[1-9][0-9]{7,14}$'),
  office_line_1 text not null check (char_length(office_line_1) between 2 and 100),
  office_line_2 text not null check (char_length(office_line_2) between 2 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table public.site_practice_areas (
  position smallint primary key check (position between 1 and 8),
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 10 and 320),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_content enable row level security;
alter table public.site_practice_areas enable row level security;

create policy "Public can read website content" on public.site_content for select to anon, authenticated using (true);
create policy "Administrators can update website content" on public.site_content for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (id = 1 and exists (select 1 from public.admin_users where user_id = (select auth.uid())));
create policy "Public can read practice areas" on public.site_practice_areas for select to anon, authenticated using (true);
create policy "Administrators can update practice areas" on public.site_practice_areas for update to authenticated
using (exists (select 1 from public.admin_users where user_id = (select auth.uid())))
with check (position between 1 and 8 and exists (select 1 from public.admin_users where user_id = (select auth.uid())));

grant select on table public.site_content to anon, authenticated;
grant update on table public.site_content to authenticated;
grant select on table public.site_practice_areas to anon, authenticated;
grant update on table public.site_practice_areas to authenticated;

create trigger site_content_set_updated_at before update on public.site_content for each row execute function public.set_updated_at();
create trigger site_practice_areas_set_updated_at before update on public.site_practice_areas for each row execute function public.set_updated_at();

insert into public.site_content (
  home_heading, home_highlight, home_description, about_heading, about_highlight, about_description,
  practice_heading, practice_highlight, practice_description, partner_heading, partner_highlight, partner_description,
  insights_heading, insights_highlight, insights_description, contact_heading, contact_highlight, contact_description,
  phone_display, phone_e164, whatsapp_number, office_line_1, office_line_2
) values (
  'The Bar of Excellence.', 'Efficient. Thorough. Reliable.', 'Strategic legal representation and advisory services across disputes, corporate law, employment, property, family, intellectual property and related matters in Nairobi and across Kenya.',
  'Practical counsel.', 'Deliberate action.', 'Achola Odhiambo & Company Advocates is a Nairobi legal practice serving clients across dispute resolution, corporate, employment, property, family, constitutional and intellectual property matters.',
  'Disputes, business, property and', 'private client work.', 'The practice spans contentious and advisory matters for individuals, businesses and organisations.',
  'Achola Michael', 'Odhiambo.', 'Advocate of the High Court of Kenya and Managing Partner of Achola Odhiambo & Company Advocates.',
  'Questions worth asking', 'early.', 'Practical legal information on disputes, employment, property, family law, contracts and brand protection.',
  'Start with the', 'matter at hand.', 'Call or WhatsApp the firm with a short summary of the issue, the stage of the matter and any immediate deadline.',
  '0112 572 628', '+254112572628', '254112572628', 'Westlands', 'Nairobi, Kenya'
);

insert into public.site_practice_areas (position, title, description) values
  (1, 'Litigation & Dispute Resolution', 'Case assessment, negotiation, preparation and representation in civil, commercial and other disputes requiring formal legal process or court intervention.'),
  (2, 'Corporate & Commercial Law', 'Business structures, company matters, contracts, transactions and practical legal support for commercial decisions.'),
  (3, 'Employment & Labour Law', 'Advice and representation involving workplace disputes, employment rights, contracts, disciplinary processes and labour-related claims.'),
  (4, 'Property & Conveyancing', 'Property transactions, due diligence, agreements, documentation and transfer-related legal steps.'),
  (5, 'Family Law, Probate & Succession', 'Divorce, children matters, succession, probate and related family legal processes requiring careful advice and documentation.'),
  (6, 'Constitutional & Human Rights', 'Advice and representation where disputes engage constitutional rights, public law or judicial review questions.'),
  (7, 'Intellectual Property & Trademarks', 'Guidance on trademarks, brand protection and other intellectual property concerns.'),
  (8, 'Criminal Defence & Personal Injury', 'Legal advice and representation in criminal defence and personal injury-related matters.');

create function public.update_controlled_site_content(p_content jsonb, p_areas jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_at timestamptz;
begin
  if jsonb_typeof(p_content) <> 'object' or jsonb_typeof(p_areas) <> 'array'
     or jsonb_array_length(p_areas) <> 8
     or (select count(distinct item.position) from jsonb_to_recordset(p_areas) as item(position smallint)) <> 8
     or exists (select 1 from jsonb_to_recordset(p_areas) as item(position smallint) where item.position not between 1 and 8) then
    raise exception 'Website content payload is incomplete.' using errcode = '22023';
  end if;

  update public.site_content set
    home_heading = p_content->>'home_heading', home_highlight = p_content->>'home_highlight', home_description = p_content->>'home_description',
    about_heading = p_content->>'about_heading', about_highlight = p_content->>'about_highlight', about_description = p_content->>'about_description',
    practice_heading = p_content->>'practice_heading', practice_highlight = p_content->>'practice_highlight', practice_description = p_content->>'practice_description',
    partner_heading = p_content->>'partner_heading', partner_highlight = p_content->>'partner_highlight', partner_description = p_content->>'partner_description',
    insights_heading = p_content->>'insights_heading', insights_highlight = p_content->>'insights_highlight', insights_description = p_content->>'insights_description',
    contact_heading = p_content->>'contact_heading', contact_highlight = p_content->>'contact_highlight', contact_description = p_content->>'contact_description',
    phone_display = p_content->>'phone_display', phone_e164 = p_content->>'phone_e164', whatsapp_number = p_content->>'whatsapp_number',
    office_line_1 = p_content->>'office_line_1', office_line_2 = p_content->>'office_line_2', updated_by = (select auth.uid())
  where id = 1 returning updated_at into changed_at;

  update public.site_practice_areas as current set
    title = incoming.title, description = incoming.description, updated_by = (select auth.uid())
  from jsonb_to_recordset(p_areas) as incoming(position smallint, title text, description text)
  where current.position = incoming.position;

  if changed_at is null or (select count(*) from public.site_practice_areas) <> 8 then
    raise exception 'Website content could not be updated.' using errcode = 'P0001';
  end if;
  return changed_at;
end;
$$;

revoke all on function public.update_controlled_site_content(jsonb, jsonb) from public, anon;
grant execute on function public.update_controlled_site_content(jsonb, jsonb) to authenticated;
