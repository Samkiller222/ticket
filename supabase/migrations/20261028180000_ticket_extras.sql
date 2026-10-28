-- Replies from submitters, spam limits, resolve times, saved replies, several browser keys per
-- visitor (for "use on another device") and screenshot attachments.

-- Columns ---------------------------------------------------------------------

alter table public.ticket_notes add column from_submitter boolean not null default false;
alter table public.ticket_tickets add column resolved_at timestamptz;
-- Hash of the submitter's IP, only used for the hourly limit below.
alter table public.ticket_tickets add column ip_hash text;
create index ticket_tickets_ip on public.ticket_tickets (ip_hash, created_at);
create index ticket_tickets_owner_created on public.ticket_tickets (owner_key_hash, created_at);

-- updated_at as before, plus resolved_at follows the status.
create or replace function public.ticket_touch() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'resolved' and old.status is distinct from 'resolved' then new.resolved_at := now();
  elsif new.status <> 'resolved' then new.resolved_at := null;
  end if;
  return new;
end $$;

-- Saved replies (admin only) ----------------------------------------------------

create table public.ticket_saved_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 60),
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.ticket_saved_replies enable row level security;
create policy "admins manage saved replies" on public.ticket_saved_replies
  for all to authenticated using ((select public.ticket_is_admin())) with check ((select public.ticket_is_admin()));

insert into public.ticket_saved_replies (title, body) values
  ('Restart first', 'Please restart the device and let us know if the problem is still there.'),
  ('Looking into it', 'Thanks, we are looking into this now and will update the ticket soon.'),
  ('Fixed', 'This should be fixed now. Reply here if it happens again.'),
  ('Need more detail', 'Could you add a bit more detail, such as the exact error message or a screenshot?');

-- Attachments -----------------------------------------------------------------

create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id bigint not null references public.ticket_tickets on delete cascade,
  path text not null unique,
  name text not null check (length(name) between 1 and 150),
  size integer,
  created_at timestamptz not null default now()
);
create index ticket_attachments_ticket on public.ticket_attachments (ticket_id);
alter table public.ticket_attachments enable row level security;
create policy "admins read attachments" on public.ticket_attachments
  for select to authenticated using ((select public.ticket_is_admin()));
create policy "admins delete attachments" on public.ticket_attachments
  for delete to authenticated using ((select public.ticket_is_admin()));

-- Helpers -----------------------------------------------------------------------

-- Hashes of the valid keys a browser holds (at most 20).
create function public.ticket_key_hashes(p_keys text[]) returns text[]
language sql immutable set search_path = ''
as $$
  select coalesce(array_agg(public.ticket_key_hash(k)), '{}')
  from (select k from unnest(p_keys) k where length(k) >= 32 limit 20) keys
$$;

create function public.ticket_owned(p_keys text[], p_ticket_id bigint) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.ticket_tickets
                 where id = p_ticket_id and owner_key_hash = any (public.ticket_key_hashes(p_keys)))
$$;

-- A ticket as its owner sees it.
create function public.ticket_owner_json(t public.ticket_tickets) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'name', t.name, 'email', t.email, 'status', t.status, 'priority', t.priority,
    'reason_label', t.reason_label, 'category', t.category, 'description', t.description,
    'created_at', t.created_at, 'updated_at', t.updated_at, 'resolved_at', t.resolved_at,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('body', n.body, 'created_at', n.created_at, 'from_submitter', n.from_submitter) order by n.created_at)
      from public.ticket_notes n where n.ticket_id = t.id
    ), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(jsonb_build_object('name', a.name) order by a.created_at)
      from public.ticket_attachments a where a.ticket_id = t.id
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.ticket_key_hashes(text[]), public.ticket_owned(text[], bigint), public.ticket_owner_json(public.ticket_tickets)
  from public, anon, authenticated;

-- Public functions ----------------------------------------------------------------

-- Spam limits on submitting: 5 an hour per browser, 10 an hour per IP address, 60 per 10 minutes overall.
create or replace function public.ticket_submit(p_name text, p_email text, p_reason_id uuid, p_priority text, p_description text, p_owner_key text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  r public.ticket_reasons;
  new_id bigint;
  key_hash text;
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}');
  ip text := nullif(trim(coalesce(headers->>'cf-connecting-ip', split_part(headers->>'x-forwarded-for', ',', 1))), '');
  ip_h text := case when ip is null then null else public.ticket_key_hash('ip:' || ip) end;
begin
  select * into r from public.ticket_reasons where id = p_reason_id and active;
  if not found then raise exception 'Pick what the problem is.'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Enter your name.'; end if;
  if length(trim(coalesce(p_description, ''))) < 10 then raise exception 'Describe the problem in at least 10 characters.'; end if;
  if length(coalesce(p_owner_key, '')) < 32 then raise exception 'Invalid browser key.'; end if;
  key_hash := public.ticket_key_hash(p_owner_key);

  if (select count(*) from public.ticket_tickets where owner_key_hash = key_hash and created_at > now() - interval '1 hour') >= 5
     or (ip_h is not null and (select count(*) from public.ticket_tickets where ip_hash = ip_h and created_at > now() - interval '1 hour') >= 10) then
    raise exception 'You have sent several tickets in the last hour. Please wait a while before sending another.';
  end if;
  if (select count(*) from public.ticket_tickets where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'The help desk is very busy right now. Please try again in a few minutes.';
  end if;

  insert into public.ticket_tickets (name, email, reason_id, reason_label, category, priority, description, owner_key_hash, ip_hash)
  values (trim(p_name), nullif(trim(p_email), ''), r.id, r.label, r.category, coalesce(p_priority, 'normal'), trim(p_description), key_hash, ip_h)
  returning id into new_id;
  return new_id;
end $$;

-- The keyless version is retired (it would skip the per-browser limit). Kept as a stub so old
-- cached pages get a clear message instead of a missing-function error.
create or replace function public.ticket_submit(p_name text, p_email text, p_reason_id uuid, p_priority text, p_description text)
returns bigint
language plpgsql security definer set search_path = ''
as $$ begin raise exception 'This page is out of date. Refresh it and try again.'; end $$;

-- All tickets for the keys a browser holds, newest first.
create function public.ticket_mine_many(p_owner_keys text[])
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(public.ticket_owner_json(t) order by t.created_at desc), '[]'::jsonb)
  from public.ticket_tickets t
  where t.owner_key_hash = any (public.ticket_key_hashes(p_owner_keys))
$$;

-- The single-key version, kept for pages loaded before this change.
create or replace function public.ticket_mine(p_owner_key text)
returns jsonb
language sql stable security definer set search_path = ''
as $$ select public.ticket_mine_many(array[p_owner_key]) $$;

-- Lookup by number now also says who wrote each note.
create or replace function public.ticket_lookup(p_id bigint)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'status', t.status, 'priority', t.priority, 'reason_label', t.reason_label, 'category', t.category,
    'created_at', t.created_at, 'updated_at', t.updated_at,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('body', n.body, 'created_at', n.created_at, 'from_submitter', n.from_submitter) order by n.created_at)
      from public.ticket_notes n where n.ticket_id = t.id
    ), '[]'::jsonb)
  )
  from public.ticket_tickets t where t.id = p_id
$$;

-- The submitter replies on their own ticket. Replying to a resolved ticket reopens it.
create function public.ticket_reply(p_owner_keys text[], p_ticket_id bigint, p_body text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.ticket_owned(p_owner_keys, p_ticket_id) then raise exception 'Ticket not found.'; end if;
  if length(trim(coalesce(p_body, ''))) not between 1 and 2000 then raise exception 'Write a reply of up to 2000 characters.'; end if;
  if (select count(*) from public.ticket_notes where ticket_id = p_ticket_id and from_submitter and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'You have replied several times in the last hour. Please wait a while.';
  end if;
  insert into public.ticket_notes (ticket_id, body, author_id, from_submitter) values (p_ticket_id, trim(p_body), null, true);
  update public.ticket_tickets set status = 'open' where id = p_ticket_id and status = 'resolved';
end $$;

-- Links an uploaded screenshot to the submitter's ticket (at most 3 per ticket).
create function public.ticket_attach(p_owner_keys text[], p_ticket_id bigint, p_path text, p_name text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  obj_size integer;
begin
  if not public.ticket_owned(p_owner_keys, p_ticket_id) then raise exception 'Ticket not found.'; end if;
  if p_path !~ '^[0-9a-f-]{36}/[^/]{1,150}$' then raise exception 'Invalid attachment.'; end if;
  select (metadata->>'size')::integer into obj_size from storage.objects where bucket_id = 'ticket-attachments' and name = p_path;
  if not found then raise exception 'The screenshot did not upload. Try again.'; end if;
  if (select count(*) from public.ticket_attachments where ticket_id = p_ticket_id) >= 3 then raise exception 'A ticket can have up to 3 screenshots.'; end if;
  insert into public.ticket_attachments (ticket_id, path, name, size)
  values (p_ticket_id, p_path, left(coalesce(nullif(trim(p_name), ''), 'screenshot'), 150), obj_size);
end $$;

revoke execute on function public.ticket_mine_many(text[]), public.ticket_reply(text[], bigint, text), public.ticket_attach(text[], bigint, text, text) from public;
grant execute on function public.ticket_mine_many(text[]), public.ticket_reply(text[], bigint, text), public.ticket_attach(text[], bigint, text, text) to anon, authenticated;

alter publication supabase_realtime add table public.ticket_attachments;
