-- Run in Supabase Dashboard > SQL Editor.
create table if not exists public.audit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  target text not null,
  device_count int not null default 1 check (device_count > 0),
  contact_method text not null check (contact_method in ('Email', 'Phone', 'In Person')),
  preferred_time text,
  context text,
  status text not null default 'New' check (status in ('New', 'In Progress', 'Completed')),
  created_at timestamptz not null default now()
);

create index if not exists audit_requests_user_id_idx on public.audit_requests (user_id);

-- No policies: only the Express API (service role) reads or writes this table.
alter table public.audit_requests enable row level security;
