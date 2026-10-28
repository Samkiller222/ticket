# IT help desk

A small ticketing system for generic IT problems. React 19 + TypeScript + Vite, with Supabase for the database and admin logins.

- **Report a problem**: name, reason (grouped IT problems), priority and description are required; email is optional. Each ticket gets a number like `TCK-1001`.
- **Check a ticket**: look up a ticket number to see its status and any admin notes.
- **Admin mode**: click the faint dot after "IT help desk" in the footer and sign in with an admin name and password. Admins see and search every ticket (live), change status, add notes, and add, hide or delete ticket reasons.

## Database

Supabase project `dhpxlmksyctpafcfdpit` (shared with other apps, so everything is prefixed `ticket_`). Schema, access rules and starter reasons are in `supabase/migrations/`.

- Visitors never read the tickets table directly. They submit through `ticket_submit()` and look up through `ticket_lookup()`, which returns status, reason and notes but not names, emails or descriptions. Notes are visible to anyone with the ticket number.
- Admins are the users listed in `ticket_admins`. Admin names map to an internal email: `Sam` signs in as `sam@ticket-desk.invalid`. A full email address also works.
- To add an admin, create the user in Supabase (Authentication > Users > Add user, email `name@ticket-desk.invalid`, tick auto-confirm), then run
  `insert into ticket_admins (user_id) select id from auth.users where email = 'name@ticket-desk.invalid';`

## Commands

- `npm install`, then copy `.env.example` to `.env.local`
- `npm run dev`: run at http://localhost:5173
- `npm run lint`, `npm test`, `npm run build`

Deployed to GitHub Pages by `.github/workflows/deploy.yml` (enable it once under Settings > Pages > Source: GitHub Actions).
