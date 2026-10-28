-- Each browser keeps a random secret key and sends it with every ticket, so people can see
-- their own tickets without signing in. Only a SHA-256 hash of the key is stored.

alter table public.ticket_tickets add column owner_key_hash text;
create index ticket_tickets_owner on public.ticket_tickets (owner_key_hash);

create function public.ticket_key_hash(p_key text) returns text
language sql immutable set search_path = ''
as $$ select encode(extensions.digest(p_key, 'sha256'), 'hex') $$;
revoke execute on function public.ticket_key_hash(text) from public, anon, authenticated;

-- Replaces the five-argument version with one that also takes the browser key.
drop function public.ticket_submit(text, text, uuid, text, text);

create function public.ticket_submit(p_name text, p_email text, p_reason_id uuid, p_priority text, p_description text, p_owner_key text default null)
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
  -- Keys are random UUIDs; refuse short ones so nobody can claim an easily guessed key.
  if p_owner_key is not null and length(p_owner_key) < 32 then raise exception 'Invalid browser key.'; end if;

  insert into public.ticket_tickets (name, email, reason_id, reason_label, category, priority, description, owner_key_hash)
  values (trim(p_name), nullif(trim(p_email), ''), r.id, r.label, r.category, coalesce(p_priority, 'normal'), trim(p_description),
          case when p_owner_key is null then null else public.ticket_key_hash(p_owner_key) end)
  returning id into new_id;
  return new_id;
end $$;

-- The caller's own tickets, newest first. Their own details are included since they hold the key.
create function public.ticket_mine(p_owner_key text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'email', t.email,
    'status', t.status,
    'priority', t.priority,
    'reason_label', t.reason_label,
    'category', t.category,
    'description', t.description,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object('body', n.body, 'created_at', n.created_at) order by n.created_at)
      from public.ticket_notes n where n.ticket_id = t.id
    ), '[]'::jsonb)
  ) order by t.created_at desc), '[]'::jsonb)
  from public.ticket_tickets t
  where length(p_owner_key) >= 32 and t.owner_key_hash = public.ticket_key_hash(p_owner_key)
$$;

revoke execute on function public.ticket_submit(text, text, uuid, text, text, text), public.ticket_mine(text) from public;
grant execute on function public.ticket_submit(text, text, uuid, text, text, text), public.ticket_mine(text) to anon, authenticated;
