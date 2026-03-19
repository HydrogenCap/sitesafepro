# SiteSafe Pro

UK construction health & safety management platform — CDM 2015 compliance, document control, contractor management, and site operations.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 7, Tailwind CSS v3 |
| UI Components | shadcn/ui (Radix primitives) |
| Routing | React Router v6 |
| State / Data | TanStack Query v5, React Hook Form + Zod |
| Backend | Lovable Cloud (Postgres, Auth, Storage, Edge Functions) |
| Animations | Framer Motion |
| Charts | Recharts |
| PDF / Word | jsPDF, docx |
| PWA | vite-plugin-pwa (workbox) |

## Key Features

- **Project Management** — Create and manage construction projects with compliance checklists
- **Document Control** — Upload, version, review/approve documents with AI classification
- **RAMS Builder** — Step-by-step Risk Assessment & Method Statement generator
- **COSHH Register** — Control of Substances Hazardous to Health with AI-powered SDS lookup
- **Contractor Management** — Invite contractors, track compliance docs, manage operatives
- **Inspections & Actions** — Raise corrective actions with evidence, track to closure
- **Permits to Work** — Hot work, confined space, excavation permits with approver separation
- **Site Diary** — Daily records with weather integration and photo capture
- **Toolbox Talks** — Deliver and record attendance with QR sign-in
- **Client Portal** — Read-only dashboards for clients with granular permissions
- **Budget & Programme** — Cost tracking, Gantt charts, payment applications
- **Offline-First PWA** — IndexedDB queue with background sync

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev

# Production build
npm run build

# Run tests
npm test
```

## Environment Variables

Required in `.env`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

## Project Structure

```
src/
  App.tsx                    # All routes (lazy-loaded)
  pages/                     # One file per route
  components/
    ui/                      # shadcn/ui primitives
    documents/               # Document management
    coshh/                   # COSHH assessments
    contractors/             # Contractor compliance
    auth/                    # Auth guards
    client/                  # Client portal
  hooks/                     # Custom hooks
  contexts/                  # AuthContext, OrgContext
  lib/                       # Utilities, PDF generators
  offline/                   # IndexedDB + sync
supabase/
  functions/                 # Edge Functions
  migrations/                # Database migrations
```

## Licence

Proprietary — © SiteSafe Pro. All rights reserved.
