# IT help desk

A small ticketing system for generic IT problems. React 19 + TypeScript + Vite.

- **Report a problem**: name, reason (grouped IT problems), priority and description are required; email is optional. Each ticket gets a number like `TCK-1001`.
- **Check a ticket**: look up a ticket number to see its status and any admin notes.
- **Admin mode**: click the faint dot after "IT help desk" in the footer and enter the PIN (default `1234`, change it under Settings). Admins can see and search open tickets, change their status, add notes, and add, hide or delete ticket reasons.

Data is saved in the browser's local storage, so tickets only exist in the browser they were submitted from. The PIN hides the admin screen from casual users; it is not real security.

## Commands

- `npm install`
- `npm run dev`: run at http://localhost:5173
- `npm run lint`, `npm test`, `npm run build`

Deployed to GitHub Pages by `.github/workflows/deploy.yml` (enable it once under Settings > Pages > Source: GitHub Actions).
