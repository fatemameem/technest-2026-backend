-- Run in Supabase Dashboard > SQL Editor.
insert into storage.buckets (id, name, public)
values ('case-attachments', 'case-attachments', false)
on conflict (id) do nothing;

create table if not exists public.incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  file_name text not null,
  content_type text not null,
  size_bytes int not null,
  path text not null,
  created_at timestamptz not null default now()
);

create index if not exists incident_attachments_incident_id_idx
  on public.incident_attachments (incident_id);

-- No policies: only the Express API (service role) reads or writes this table and bucket.
alter table public.incident_attachments enable row level security;
