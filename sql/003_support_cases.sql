-- Run in Supabase Dashboard > SQL Editor.
create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resident text not null,
  contact text not null,
  issue_type text not null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'New' check (status in ('New', 'In Progress', 'Resolved')),
  assigned_to text,
  description text not null,
  notes text not null default '',
  follow_up boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_cases_user_id_idx on public.support_cases (user_id);

-- No policies: only the Express API (service role) reads or writes this table.
alter table public.support_cases enable row level security;
