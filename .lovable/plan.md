

# SiteSafe Pro — Full Code Review Fix Plan (13 Items)

## Already Completed (Previous Sessions)
- create-organisation auth check (P0)
- check-subscription trial logic (P1)
- AdminPanel owner email lookup (P1)
- create-checkout price validation (P1)
- 5 stale useEffect hooks

## Remaining Fixes — Ordered by Priority

---

### Fix 1 — [CRITICAL] Schedule pg_cron Jobs for 4 Compliance Edge Functions

Create a database migration that schedules daily cron jobs for the 4 compliance-checking functions that currently have no trigger:

| Job | Schedule | Edge Function |
|-----|----------|---------------|
| check-document-expiry | 06:00 UTC | `check-document-expiry` |
| check-overdue-actions | 06:30 UTC | `check-overdue-actions` |
| check-permit-expiry | 07:00 UTC | `check-permit-expiry` |
| check-contractor-doc-expiry | 07:30 UTC | `check-contractor-doc-expiry` |

Each job uses `net.http_post()` with the project URL and anon key. Will be executed via SQL insert (not migration) since it contains project-specific credentials.

**File:** Direct SQL execution via Supabase tool

---

### Fix 2 — [CRITICAL] Add Auth to 3 Unprotected Edge Functions

Add JWT verification to:
- `get-weather/index.ts` — verify Bearer token before processing
- `lookup-emergency-services/index.ts` — same pattern
- `seed-default-templates/index.ts` — verify token AND check org admin/owner membership

**Files:** 3 edge functions

---

### Fix 3 — [CRITICAL] Fix Overly Permissive RLS Policies

Create a migration to:
- Drop and recreate `"Service can update exports"` on `document_exports` with `TO service_role`
- Drop and recreate `"Service role can insert logs"` on `activity_logs` with `TO service_role`

**File:** New database migration

---

### Fix 4 — [CRITICAL] Replace README.md

Replace Lovable boilerplate with proper SiteSafe Pro documentation: project name, description, tech stack, key features, setup instructions.

**File:** `README.md`

---

### Fix 5 — [QUALITY] Consolidate Toast System to Sonner

Replace all 26+ `useToast` imports with `toast` from `sonner`. Files to update:
- `AdminPanel.tsx`, `DiaryEntry.tsx`, `ForgotPassword.tsx`, `RamsBuilder.tsx`, `Inspections.tsx`
- `InviteMemberDialog.tsx`, `MemberDetailPanel.tsx`, `InviteClientDialog.tsx`
- `NotificationSettings.tsx`, `WhatsAppSettings.tsx`, `ProfileSettings.tsx`, `OrganisationSettings.tsx`, `ClientPortalSettings.tsx`
- `SignatureCapture.tsx` and others

Then remove: `src/hooks/use-toast.ts`, `src/components/ui/use-toast.ts`, `src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`, and the Radix `<Toaster>` from `App.tsx`.

**Files:** ~26 files + 4 deletions + App.tsx

---

### Fix 6 — [QUALITY] Restrict CORS Origins

Create a shared `supabase/functions/_shared/cors.ts` with origin allowlist (`sitesafe.cloud`, `sitesafepro.lovable.app`, localhost in dev). Update all 36 edge functions to import from the shared module.

**Files:** New `_shared/cors.ts` + all 36 edge functions

---

### Fix 7 — [QUALITY] Split AdminPanel.tsx (1,600 lines)

Extract into:
- `src/components/admin/PlatformOverview.tsx`
- `src/components/admin/OrganisationTable.tsx`
- `src/components/admin/RiddorTracker.tsx`
- `src/components/admin/ComplianceAlerts.tsx`
- `src/components/admin/AuditLogViewer.tsx`
- `src/types/admin.ts` and `src/lib/admin-utils.ts`

Keep `AdminPanel.tsx` as a thin shell with Tabs.

**Files:** 7 new files, 1 refactored

---

### Fix 8 — [QUALITY] Remove "Coming Soon" Placeholders

- `ProjectDetail.tsx` line 238: The Permits page already exists — wire up navigation to `/permits` instead of showing a toast.
- `ContractorDetail.tsx` line 370-375: Query `activity_logs` for the contractor's org and render a basic activity feed, or remove the tab entirely.

**Files:** 2 pages

---

### Fix 9 — [QUALITY] Enhance Cookie Consent Banner

`CookieConsent.tsx` already exists but only has "Accept" and dismiss (X). Add:
- "Reject Non-Essential" button
- "Manage Preferences" option
- Store granular consent (essential/analytics/marketing)
- Only load analytics after explicit consent

**File:** `src/components/CookieConsent.tsx`

---

### Fix 10 — [QUALITY] Add Rate Limiting to Edge Functions

Create a shared rate-limit helper + database RPC function. Apply to:
- `contact-form` (5/hr per IP)
- `coshh-ai-lookup` (30/hr per user)
- `generate-document` (20/hr per user)
- `classify-document` (30/hr per user)
- `site-access` (60/hr per IP)
- `get-weather` (30/hr per user)
- `lookup-emergency-services` (20/hr per user)

**Files:** New `_shared/rate-limit.ts`, new migration, 7 edge functions

---

### Fix 11 — [POLISH] Eliminate High-Impact `any` Types

Target the most impactful files first:
- `OrgContext.tsx:56` — type the membership mapping row
- All `catch (error: any)` → `catch (error: unknown)` with type narrowing
- RAMS steps: replace `parseJsonArray<any>()`
- `AdminPanel.tsx`: properly type `STRIPE_PRODUCTS`

**Files:** ~15-20 files

---

### Fix 12 — [POLISH] Add Sentry Error Monitoring

- Add `@sentry/react` dependency
- Create `src/lib/sentry.ts` with init config
- Wire into `main.tsx` and `ErrorBoundary.tsx`
- Add `VITE_SENTRY_DSN` to `.env.example`
- Will need user to provide their Sentry DSN

**Files:** 4 files + package.json

---

### Fix 13 — [POLISH] Remove Lovable Auth Dependency

This file is auto-generated by Lovable and marked as such. **This fix will be skipped** — modifying auto-generated Lovable integration files could break the project. The `@lovable.dev/cloud-auth-js` is the standard auth integration for Lovable Cloud projects.

---

## Implementation Order

Due to message size limits, fixes will be batched:
- **Batch 1:** Fixes 1-4 (Critical)
- **Batch 2:** Fix 5 (Toast consolidation — touches ~30 files)
- **Batch 3:** Fixes 6, 8, 9 (CORS, coming soon, cookie consent)
- **Batch 4:** Fix 7 (AdminPanel split — large refactor)
- **Batch 5:** Fix 10 (Rate limiting)
- **Batch 6:** Fixes 11-12 (Polish)

