# IT help desk

A small ticketing system for generic IT problems. React 19 + TypeScript + Vite, with Supabase for the database, storage and admin login.

## For people reporting problems

- **Report a problem**: name, reason, priority and description are required; email is optional. Up to 3 screenshots (pick files or paste). Each ticket gets a number like `TCK-1001`.
- **Your tickets**: everything sent from this browser, live, with status, age and a conversation with the help desk. Replying to a resolved ticket reopens it.
- **Other device**: a private link and QR code that makes another phone or computer share the same list.
- **Look up a ticket by number**: for tickets sent from somewhere else.

## Admin mode

Click the faint dot after "IT help desk" in the footer and sign in with an admin name and password.

- **Tickets**: filter (open, waiting on you, resolved, all), search, filter by category and priority, sort. Each ticket shows its age (amber after 2 days, red after 5), a "New" or "New reply" badge, screenshots, the conversation, saved replies, status and delete.
- **Alerts**: the tab title shows how many tickets are waiting on you; new tickets and replies play a chime (toggle in the header) and show a browser notification once allowed.
- **Overview**: open tickets by priority, most common problems this week, average time to resolve.
- **Ticket reasons** and **Saved replies**: add, hide or delete.

## Database

Supabase project `dhpxlmksyctpafcfdpit` (shared with other apps, so everything is prefixed `ticket_`). Schema, access rules and seed data are in `supabase/migrations/`.

- Visitors never read the ticket tables directly. They go through functions: `ticket_submit`, `ticket_mine_many`, `ticket_reply`, `ticket_attach` (all keyed by the browser's secret key, stored only as a hash) and `ticket_lookup` (status, reason and notes only).
- Spam limits: 5 tickets an hour per browser, 10 per IP address, 60 per 10 minutes overall; 10 replies an hour per ticket.
- Screenshots go to the private `ticket-attachments` bucket (images, 5 MB). Visitors can upload but not read; admins see them through short-lived signed links.
- Everything updates live. Admins get Realtime changes on the ticket tables (RLS applies). Visitors can't read those tables, so triggers broadcast a data-free "changed" ping on public topics (a browser's key hash, a ticket number, the reasons list) and the page reloads through the functions above.
- Admins are the users listed in `ticket_admins`. Admin names map to an internal email: `Sam` signs in as `sam@ticket-desk.invalid`.

## Commands

- `npm install`, then copy `.env.example` to `.env.local`
- `npm run dev`: run at http://localhost:5173
- `npm run lint`, `npm test`, `npm run build`

Deployed to GitHub Pages by `.github/workflows/deploy.yml`.
