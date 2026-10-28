-- Live updates for visitors. Visitors can't read the ticket tables, so instead of postgres_changes
-- these triggers broadcast a data-free "changed" ping on public Realtime topics, and the page
-- reloads through ticket_mine / ticket_lookup / ticket_reasons as before. Topics:
--   ticket-desk:owner:<sha256 of browser key>  a browser's own tickets
--   ticket-desk:ticket:<id>                     a ticket someone looked up by number
--   ticket-desk:reasons                         the list of reasons
-- The pings carry only the ticket id, so listening on a topic reveals nothing new.

create function public.ticket_ping(p_id bigint, p_owner_key_hash text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.send(jsonb_build_object('id', p_id), 'changed', 'ticket-desk:ticket:' || p_id, false);
  if p_owner_key_hash is not null then
    perform realtime.send(jsonb_build_object('id', p_id), 'changed', 'ticket-desk:owner:' || p_owner_key_hash, false);
  end if;
end $$;

create function public.ticket_tickets_ping() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  t public.ticket_tickets := coalesce(new, old);
begin
  perform public.ticket_ping(t.id, t.owner_key_hash);
  return null;
end $$;

create trigger ticket_tickets_ping after insert or update or delete on public.ticket_tickets
for each row execute function public.ticket_tickets_ping();

-- Notes already bump their ticket's updated_at (ticket_notes_touch), which pings above. Deleting a
-- note doesn't, so ping for that directly.
create function public.ticket_notes_ping() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  owner text;
begin
  select owner_key_hash into owner from public.ticket_tickets where id = old.ticket_id;
  if found then perform public.ticket_ping(old.ticket_id, owner); end if;
  return null;
end $$;

create trigger ticket_notes_ping after delete on public.ticket_notes
for each row execute function public.ticket_notes_ping();

create function public.ticket_reasons_ping() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.send('{}'::jsonb, 'changed', 'ticket-desk:reasons', false);
  return null;
end $$;

create trigger ticket_reasons_ping after insert or update or delete on public.ticket_reasons
for each statement execute function public.ticket_reasons_ping();

revoke execute on function public.ticket_ping(bigint, text), public.ticket_tickets_ping(), public.ticket_notes_ping(), public.ticket_reasons_ping()
  from public, anon, authenticated;
