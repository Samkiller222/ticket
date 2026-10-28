-- IT help desk. Lives in the shared Supabase project, so every object is prefixed ticket_.
--
-- Access model:
--   * Anyone (signed in or not) can read active reasons, submit a ticket through ticket_submit()
--     and look up a ticket's status through ticket_lookup(). Neither function returns the
--     submitter's name, email or description.
--   * Only users listed in ticket_admins can read tickets, change them, add notes or edit reasons.

create table public.ticket_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table public.ticket_reasons (
  id uuid primary key default gen_random_uuid(),
  category text not null check (length(trim(category)) between 1 and 60),
  label text not null check (length(trim(label)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index ticket_reasons_unique on public.ticket_reasons (lower(category), lower(label));

create table public.ticket_tickets (
  id bigint generated always as identity (start with 1001) primary key,
  name text not null check (length(trim(name)) between 1 and 100),
  email text check (email is null or length(email) <= 200),
  reason_id uuid references public.ticket_reasons on delete set null,
  -- Copied at submit time so the ticket still reads right if the reason is renamed or deleted.
  reason_label text not null,
  category text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  description text not null check (length(trim(description)) between 10 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ticket_tickets_status on public.ticket_tickets (status);
create index ticket_tickets_reason on public.ticket_tickets (reason_id);

create table public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id bigint not null references public.ticket_tickets on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  author_id uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index ticket_notes_ticket on public.ticket_notes (ticket_id);
create index ticket_notes_author on public.ticket_notes (author_id);

-- Helpers -------------------------------------------------------------------

create function public.ticket_is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.ticket_admins where user_id = (select auth.uid())) $$;

create function public.ticket_touch() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger ticket_tickets_touch before update on public.ticket_tickets
for each row execute function public.ticket_touch();

-- A note counts as an update to its ticket, so the submitter sees a fresh "last updated".
create function public.ticket_note_touch() returns trigger
language plpgsql security definer set search_path = ''
as $$ begin update public.ticket_tickets set updated_at = now() where id = new.ticket_id; return new; end $$;

create trigger ticket_notes_touch after insert on public.ticket_notes
for each row execute function public.ticket_note_touch();

-- Row-level security ---------------------------------------------------------

alter table public.ticket_admins enable row level security;
alter table public.ticket_reasons enable row level security;
alter table public.ticket_tickets enable row level security;
alter table public.ticket_notes enable row level security;

create policy "admins see the admin list" on public.ticket_admins
  for select to authenticated using ((select public.ticket_is_admin()));

create policy "anyone reads active reasons, admins read all" on public.ticket_reasons
  for select to anon, authenticated using (active or (select public.ticket_is_admin()));
create policy "admins add reasons" on public.ticket_reasons
  for insert to authenticated with check ((select public.ticket_is_admin()));
create policy "admins change reasons" on public.ticket_reasons
  for update to authenticated using ((select public.ticket_is_admin())) with check ((select public.ticket_is_admin()));
create policy "admins delete reasons" on public.ticket_reasons
  for delete to authenticated using ((select public.ticket_is_admin()));

create policy "admins read tickets" on public.ticket_tickets
  for select to authenticated using ((select public.ticket_is_admin()));
create policy "admins change tickets" on public.ticket_tickets
  for update to authenticated using ((select public.ticket_is_admin())) with check ((select public.ticket_is_admin()));
create policy "admins delete tickets" on public.ticket_tickets
  for delete to authenticated using ((select public.ticket_is_admin()));

create policy "admins read notes" on public.ticket_notes
  for select to authenticated using ((select public.ticket_is_admin()));
create policy "admins add notes" on public.ticket_notes
  for insert to authenticated with check ((select public.ticket_is_admin()));
create policy "admins delete notes" on public.ticket_notes
  for delete to authenticated using ((select public.ticket_is_admin()));

-- Public functions -----------------------------------------------------------

create function public.ticket_submit(p_name text, p_email text, p_reason_id uuid, p_priority text, p_description text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  r public.ticket_reasons;
  new_id bigint;
begin
  select * into r from public.ticket_reasons where id = p_reason_id and active;
  if not found then raise exception 'Pick what the problem is.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter your name.'; end if;
  if length(trim(coalesce(p_description, ''))) < 10 then raise exception 'Describe the problem in at least 10 characters.'; end if;

  insert into public.ticket_tickets (name, email, reason_id, reason_label, category, priority, description)
  values (trim(p_name), nullif(trim(p_email), ''), r.id, r.label, r.category, coalesce(p_priority, 'normal'), trim(p_description))
  returning id into new_id;
  return new_id;
end $$;

create function public.ticket_lookup(p_id bigint)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'status', t.status,
    'priority', t.priority,
    'reason_label', t.reason_label,
    'category', t.category,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('body', n.body, 'created_at', n.created_at) order by n.created_at)
      from public.ticket_notes n where n.ticket_id = t.id
    ), '[]'::jsonb)
  )
  from public.ticket_tickets t where t.id = p_id
$$;

revoke execute on function public.ticket_touch(), public.ticket_note_touch() from public, anon, authenticated;
-- The reasons policy calls ticket_is_admin() for anonymous visitors too; it just returns false for them.
revoke execute on function public.ticket_is_admin() from public;
grant execute on function public.ticket_is_admin() to anon, authenticated;
revoke execute on function public.ticket_submit(text, text, uuid, text, text), public.ticket_lookup(bigint) from public;
grant execute on function public.ticket_submit(text, text, uuid, text, text), public.ticket_lookup(bigint) to anon, authenticated;

-- Live updates for the admin ticket list (RLS still applies to what each client receives).
alter publication supabase_realtime add table public.ticket_tickets, public.ticket_notes;

-- Starter reasons -------------------------------------------------------------

insert into public.ticket_reasons (category, label) values
  ('Accounts and access', 'Forgot password'),
  ('Accounts and access', 'Account locked out'),
  ('Accounts and access', 'Need access to a shared folder'),
  ('Accounts and access', 'Two-factor code not arriving'),
  ('Accounts and access', 'New starter account setup'),
  ('Hardware', 'Computer will not turn on'),
  ('Hardware', 'Computer is running slowly'),
  ('Hardware', 'Monitor not displaying'),
  ('Hardware', 'Keyboard or mouse not working'),
  ('Hardware', 'Laptop battery not charging'),
  ('Software', 'Application keeps crashing'),
  ('Software', 'Need software installed'),
  ('Software', 'Software licence expired'),
  ('Software', 'Operating system update failed'),
  ('Software', 'Pop-ups or suspected virus'),
  ('Network', 'No internet connection'),
  ('Network', 'Wi-Fi keeps dropping'),
  ('Network', 'VPN will not connect'),
  ('Network', 'Cannot reach an internal website'),
  ('Email', 'Cannot send or receive email'),
  ('Email', 'Mailbox is full'),
  ('Email', 'Suspicious or phishing email'),
  ('Email', 'Calendar not syncing'),
  ('Printing', 'Printer offline'),
  ('Printing', 'Paper jam'),
  ('Printing', 'Print jobs stuck in queue'),
  ('Printing', 'Scanner not working'),
  ('Phones and devices', 'Phone not syncing work email'),
  ('Phones and devices', 'Lost or stolen device'),
  ('Phones and devices', 'Headset or webcam not working'),
  ('Other', 'Something else');

-- Sam is the first admin. Add more with: insert into public.ticket_admins (user_id) select id from auth.users where email = '...';
insert into public.ticket_admins (user_id) select id from auth.users where email = 'sammicallef12@gmail.com';
