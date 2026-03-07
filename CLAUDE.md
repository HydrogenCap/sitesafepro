# SiteSafe Pro — Claude Code Instructions

UK construction health & safety management platform. Built with React 18, TypeScript, Vite 7, Tailwind CSS, Supabase, and shadcn/ui.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 7, Tailwind CSS v3 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Routing | React Router v6 (all routes in `src/App.tsx`) |
| State / Data | TanStack Query v5, React Hook Form + Zod |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) |
| Animations | Framer Motion |
| Charts | Recharts |
| PDF generation | jsPDF v4, pdfjs-dist v5 |
| Word generation | docx v9 |
| Testing | Vitest + Testing Library |
| PWA | vite-plugin-pwa (workbox) |

## Commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run preview    # Preview production build locally
npm test           # Run Vitest test suite
npm run lint       # ESLint
```

## Project Structure

```
src/
  App.tsx                    # All routes (React.lazy + Suspense)
  pages/                     # One file per route/page
  components/
    ui/                      # shadcn/ui primitives (do not edit these without care)
    documents/               # Document management components
    coshh/                   # COSHH assessment components
    auth/                    # Auth guards (RequireRole, ProtectedRoute)
    client/                  # Client portal components
    offline/                 # PWA offline/sync components
    site-mode/               # Mobile site capture components
  hooks/                     # Custom hooks (useDocumentUpload, usePdfTextExtraction, etc.)
  contexts/                  # AuthContext, OrgContext, ClientPortalContext
  integrations/supabase/     # Auto-generated Supabase client + types (do not hand-edit types.ts)
  offline/                   # IndexedDB queue + SyncContext for offline-first
  lib/                       # Utilities (cn, document-generator, report-generators)
```

## Supabase

- Client: `import { supabase } from "@/integrations/supabase/client"`
- Types: `src/integrations/supabase/types.ts` — auto-generated, do not edit manually
- Edge Functions: invoked via `supabase.functions.invoke("function-name", { body: {...} })`
- Storage bucket: `documents`
- Auth: session stored in localStorage, auto-refresh enabled
- Key tables: `projects`, `documents`, `document_acknowledgements`, `organisation_members`, `organisations`, `profiles`, `rams`, `incidents`, `actions`, `permits`, `inspections`, `inductions`

## Key Patterns

**Adding a new page:**
1. Create `src/pages/MyPage.tsx`
2. Add lazy import in `src/App.tsx`: `const MyPage = lazy(() => import("./pages/MyPage"))`
3. Add `<Route path="/my-path" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />` before the `*` catch-all

**Forms:** Always use `react-hook-form` + `zod` schema validation. Never uncontrolled inputs.

**Data fetching:** Use TanStack Query (`useQuery`, `useMutation`) for server state. Avoid `useEffect` + `fetch` patterns.

**Styling:** Tailwind utility classes only. Use `cn()` from `@/lib/utils` for conditional classes. Theme tokens via CSS variables (defined in `index.css`).

**Toast notifications:** `import { toast } from "sonner"` — use `toast.success()`, `toast.error()`.

**Icons:** lucide-react only.

**Dates:** date-fns only. Format: `format(date, "d MMM yyyy")`.

## Domain Context

This is a CDM 2015 / UK H&S compliance platform for construction sites. Key domain concepts:
- **RAMS** — Risk Assessment & Method Statement
- **CDM** — Construction Design and Management regulations
- **COSHH** — Control of Substances Hazardous to Health
- **F10** — HSE notification for notifiable construction projects
- **Permit to Work** — Formal authorisation for hazardous tasks (hot work, confined space, excavation)
- **Induction** — Site safety briefing that workers must complete before starting
- **Toolbox Talk** — Short safety briefing delivered on-site

## Security Rules

- NEVER commit `.env` files or hardcode secrets
- All user-supplied CSS values must pass through `sanitizeColor()` in `src/components/ui/chart.tsx`
- Use `supabase.from().select()` with RLS — never bypass row-level security
- Validate at system boundaries (user input, edge function responses)
- `src/integrations/supabase/client.ts` is auto-generated — do not add logic there

## Code Standards

- Files under 500 lines — extract sub-components or hooks if growing larger
- TypeScript strict mode — no `any` unless absolutely unavoidable
- No `console.log` in production code (use structured error handling)
- Prefer editing existing files over creating new ones
- Test files go in `src/__tests__/` or co-located as `*.test.tsx`

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```
