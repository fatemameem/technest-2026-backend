-- Run in Supabase Dashboard > SQL Editor.
alter table public.audit_requests add column if not exists assigned_to text;
