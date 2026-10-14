-- Run in Supabase Dashboard > SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may read their own profile; no client-side writes (role can't be self-promoted).
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Every new auth user gets a customer profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- Only the auth trigger needs this; block it from /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promote an admin manually:
-- update public.profiles set role = 'admin' where id = '<user-uuid>';
