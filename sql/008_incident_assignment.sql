-- Run in Supabase Dashboard > SQL Editor.
alter table public.incidents add column if not exists assigned_to text;
