-- Run in Supabase Dashboard > SQL Editor.
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resident text not null,
  email text,
  phone text,
  issue_type text not null,
  urgency text not null default 'Medium' check (urgency in ('Low', 'Medium', 'High')),
  status text not null default 'New' check (status in ('New', 'In Progress', 'Resolved')),
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists incidents_user_id_idx on public.incidents (user_id);

-- No policies: only the Express API (service role) reads or writes this table.
alter table public.incidents enable row level security;
