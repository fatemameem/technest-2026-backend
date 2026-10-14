-- Run in Supabase Dashboard > SQL Editor.
create table if not exists public.council_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Peter-McGill Community Council',
  region text not null default 'Montréal, QC',
  contact_email text not null default 'council@peter-mcgill.org',
  notify_incidents boolean not null default true,
  notify_training boolean not null default true,
  weekly_digest boolean not null default false,
  product_updates boolean not null default false
);

insert into public.council_settings (id) values (1) on conflict (id) do nothing;

-- No policies: only the Express API (service role) reads or writes this table.
alter table public.council_settings enable row level security;
