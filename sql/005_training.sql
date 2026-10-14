-- Run in Supabase Dashboard > SQL Editor.
create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (
    category in ('Phishing', 'Passwords', 'AI Safety', 'Social Engineering', 'General')
  ),
  description text not null,
  capacity int not null check (capacity > 0),
  next_session timestamptz
);

create table if not exists public.training_registrations (
  program_id uuid not null references public.training_programs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (program_id, user_id)
);

-- No policies: only the Express API (service role) reads or writes these tables.
alter table public.training_programs enable row level security;
alter table public.training_registrations enable row level security;

-- Seed the programs that used to be mock data (only when the table is empty).
insert into public.training_programs (title, category, description, capacity, next_session)
select * from (values
  ('Password Security & Management', 'Passwords', 'Hands-on workshop on creating strong passwords and using a password manager.', 30, now() + interval '7 days'),
  ('AI & Online Safety', 'AI Safety', 'How to spot AI-generated scams and protect personal data when using AI tools.', 25, now() + interval '9 days'),
  ('Social Engineering Awareness', 'Social Engineering', 'Recognize manipulation tactics used in phone, email, and in-person scams.', 40, now() + interval '13 days'),
  ('Phishing Awareness Workshop', 'Phishing', 'Identify phishing emails, suspicious links, and reporting workflows.', 50, now() + interval '10 days'),
  ('Two-Factor Authentication 101', 'Passwords', 'Set up 2FA on common accounts: email, banking, and social.', 30, now() + interval '17 days'),
  ('Detecting Deepfakes', 'AI Safety', 'Tools and habits to verify videos, voices, and images shared with you.', 35, now() + interval '20 days'),
  ('Safe Online Banking', 'General', 'Best practices for protecting financial accounts online.', 25, now() + interval '24 days'),
  ('Recognizing Romance Scams', 'Social Engineering', 'Patterns, red flags, and how to support someone targeted.', 20, now() + interval '27 days')
) as v (title, category, description, capacity, next_session)
where not exists (select 1 from public.training_programs);
