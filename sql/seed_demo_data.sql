-- Optional demo data (the former mock cases). Run in Supabase Dashboard > SQL Editor.
-- Requires at least one admin. Rows are owned by the first admin, so they show in the
-- admin screens but not in any resident's "My Requests".
-- Remove later with:
--   delete from public.incidents where email = 'demo@example.com';
--   delete from public.support_cases where contact = 'demo@example.com';
do $$
declare
  owner_id uuid;
begin
  select id into owner_id from public.profiles where role = 'admin' order by created_at limit 1;
  if owner_id is null then
    raise exception 'Create an admin first (see /setup).';
  end if;

  if exists (select 1 from public.incidents where email = 'demo@example.com') then
    raise notice 'Demo data already present; nothing inserted.';
    return;
  end if;

  insert into public.incidents (user_id, resident, email, issue_type, status, description, created_at) values
    (owner_id, 'John Doe', 'demo@example.com', 'Identity Theft', 'New', 'Resident''s account was compromised. Needs assistance with recovery.', now() - interval '1 day'),
    (owner_id, 'Marie Lavoie', 'demo@example.com', 'Phishing Email', 'New', 'Received a fake CRA tax-refund email with a payment link.', now() - interval '2 days'),
    (owner_id, 'Samir Khan', 'demo@example.com', 'Phone Scam', 'New', 'Caller posed as Service Canada and requested SIN number over the phone.', now() - interval '2 days'),
    (owner_id, 'Elena Roy', 'demo@example.com', 'Account Takeover', 'In Progress', 'Facebook account locked out; suspicious password reset.', now() - interval '5 days'),
    (owner_id, 'Daniel Smith', 'demo@example.com', 'Malware', 'In Progress', 'Pop-ups and slowdowns after installing a free PDF tool.', now() - interval '7 days'),
    (owner_id, 'Aïsha Bélanger', 'demo@example.com', 'Phishing Email', 'Resolved', 'Reported as spoofed bank message — no credentials shared.', now() - interval '11 days');

  insert into public.support_cases (user_id, resident, contact, issue_type, priority, status, assigned_to, description, notes, created_at, updated_at) values
    (owner_id, 'John Doe', 'demo@example.com', 'Identity Theft', 'High', 'In Progress', 'Priya Singh',
      'Unauthorized use of SIN and banking credentials.',
      'Initial triage complete. Advised to contact Equifax and freeze credit. Follow-up call scheduled.',
      now() - interval '3 days', now() - interval '2 hours'),
    (owner_id, 'Elena Roy', 'demo@example.com', 'Account Takeover', 'High', 'In Progress', 'Marc Tremblay',
      'Social media account compromised via credential stuffing.',
      'Password reset completed. 2FA enabled on primary accounts. Monitoring for further activity.',
      now() - interval '5 days', now() - interval '1 day'),
    (owner_id, 'Daniel Smith', 'demo@example.com', 'Malware Cleanup', 'Medium', 'In Progress', 'Priya Singh',
      'Laptop showing signs of adware and a keylogger.',
      'Ran Malwarebytes scan; 14 threats removed. System restored from backup. Browser extensions audited.',
      now() - interval '6 days', now() - interval '2 days'),
    (owner_id, 'Samir Khan', 'demo@example.com', 'Phone Scam Follow-up', 'Medium', 'New', 'Lucie Bernard',
      'Received a CRA impersonation call. No financial loss reported.',
      '',
      now() - interval '4 days', now() - interval '3 days'),
    (owner_id, 'Marie Lavoie', 'demo@example.com', 'Phishing Triage', 'Low', 'New', 'Lucie Bernard',
      'Spoofed bank email intercepted before credentials were entered.',
      '',
      now() - interval '5 days', now() - interval '4 days');
end
$$;
