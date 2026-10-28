-- Private bucket for ticket screenshots: images only, up to 5 MB each.
-- Visitors can upload into a random folder (uuid/filename) but never list or read files; the
-- upload only counts once ticket_attach() links it to a ticket they own. Admins read and delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 5242880, array['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

create policy "ticket attachments: anyone uploads to a random folder" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'ticket-attachments' and name ~ '^[0-9a-f-]{36}/[^/]{1,150}$');

create policy "ticket attachments: admins read" on storage.objects
  for select to authenticated
  using (bucket_id = 'ticket-attachments' and (select public.ticket_is_admin()));

create policy "ticket attachments: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ticket-attachments' and (select public.ticket_is_admin()));
