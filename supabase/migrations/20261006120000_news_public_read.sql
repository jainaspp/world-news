-- Safe to re-run. Does not drop the news table or its rows.
-- Public clients may only read. Inserts, updates, and deletes have no policy,
-- so the anonymous key cannot write. The server key bypasses row security.

create table if not exists public.news (
  id text primary key,
  title text not null default '',
  link text not null,
  source text not null default '',
  source_url text not null default '',
  region text not null default 'ALL',
  regions text not null default 'ALL',
  pub_date timestamptz not null default now(),
  fetched_at timestamptz not null default now()
);

alter table public.news add column if not exists source_url text not null default '';
alter table public.news add column if not exists regions text not null default 'ALL';
alter table public.news add column if not exists fetched_at timestamptz not null default now();
alter table public.news add column if not exists region text not null default 'ALL';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'news' and column_name = 'summary'
  ) then
    alter table public.news alter column summary set default '';
    alter table public.news alter column summary drop not null;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'news' and column_name = 'image_url'
  ) then
    alter table public.news alter column image_url set default '';
    alter table public.news alter column image_url drop not null;
  end if;
end $$;

delete from public.news where link is null or btrim(link) = '';

delete from public.news a
using public.news b
where a.link = b.link
  and a.ctid < b.ctid;

create unique index if not exists news_link_uidx on public.news (link);
create index if not exists news_pub_date_idx on public.news (pub_date desc);

alter table public.news enable row level security;

drop policy if exists "public_read" on public.news;
drop policy if exists "service_write" on public.news;
drop policy if exists "anon_read" on public.news;

create policy "anon_read" on public.news
  for select
  to anon, authenticated
  using (true);

revoke all on table public.news from public;
revoke all on table public.news from anon, authenticated;
grant select on table public.news to anon, authenticated;
grant all on table public.news to service_role;
