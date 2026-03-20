# SiteSafe Pro Deeper Code Review

Date: 2026-03-20
Repo snapshot: `sitesafepro-main (4).zip`
Review type: Static review supplement
Related report: `.lovable/full-code-review-2026-03-19.md`

## Executive Summary

This deeper pass focused on:

- public site access / induction flows
- toolbox attendance integrity
- multi-organisation billing and subscription behavior
- client portal and offline flow validation

I found 4 additional issues worth patching. The most important one is that the public site induction flow is not actually enforced server-side.

## Findings

### 1. [P1] Public site induction can be bypassed because check-in trusts a client-supplied boolean

Files:
- `supabase/functions/site-access/index.ts:192-245`
- `supabase/migrations/20260206150229_3950938b-cac1-4bbb-a183-fc2d19c74fe1.sql:14-24`

Why this matters:
- The public `check-in` action accepts `has_signed_induction` straight from the request body.
- The backend does not verify that an induction completion record exists for this visitor, access code, or project.
- A direct API caller can skip the induction entirely and still create a `site_visits` row marked as inducted.

Evidence:
- `site-access/index.ts:204` derives `has_signed_induction` from `body.has_signed_induction === true`.
- `site-access/index.ts:228-243` inserts that value directly into `site_visits`.
- `site_visits` stores only a boolean flag, not a required completion reference, in `20260206150229_3950938b-cac1-4bbb-a183-fc2d19c74fe1.sql:14-24`.

Recommended fix:
- Require a validated induction completion ID during check-in when an active induction template exists.
- Verify that the completion belongs to the same access code/project and the same visitor identity.
- Stop trusting a raw boolean from the client for safety induction status.

### 2. [P1] The induction checklist is not enforced or linked to the resulting site visit

Files:
- `supabase/functions/site-access/index.ts:110-188`
- `src/components/checkin/InductionFlow.tsx:123-137`
- `supabase/migrations/20260206175553_8e5edb5d-a12e-4a7c-85bc-88001951d9ed.sql:23-35`

Why this matters:
- The frontend sends `checked_items`, but the backend ignores them completely.
- The backend records only a signature and visitor details, not which required induction items were acknowledged.
- Although `site_induction_completions` has a `site_visit_id` column, the public flow never links the induction completion to the later `site_visits` record.
- In practice, the system can claim a visitor completed induction without proving they acknowledged the required checklist or tying that completion to the visit they used to enter site.

Evidence:
- The client sends `checked_items` in `InductionFlow.tsx:123-137`.
- `site-access/index.ts:110-188` validates only `code`, `template_id`, visitor details, and `signature_data`.
- The insert into `site_induction_completions` at `site-access/index.ts:159-172` stores no checklist answers and no `site_visit_id`.
- The schema includes `site_visit_id UUID REFERENCES public.site_visits(id)` in `20260206175553_8e5edb5d-a12e-4a7c-85bc-88001951d9ed.sql:23-35`, but this flow never uses it.

Recommended fix:
- Persist the acknowledged checklist item IDs server-side.
- Enforce that all required items were acknowledged before creating a completion.
- Link the induction completion to the eventual `site_visits` row during check-in.

### 3. [P1] Public check-out can be forged with just the access code and visitor email

File: `supabase/functions/site-access/index.ts:262-313`

Why this matters:
- The public `check-out` action allows checkout by `code + visitor_email` with no other proof of possession or identity.
- Anyone who knows or guesses the email used at check-in can mark another visitor as off-site.
- In a real-world evacuation or roll-call scenario, that can make the live visitor log inaccurate in a safety-critical way.

Evidence:
- `site-access/index.ts:277-290` resolves the visit using only the public access code and visitor email.
- `site-access/index.ts:307-313` then updates `checked_out_at` immediately.

Recommended fix:
- Require a stronger checkout credential, such as the original `visit_id` plus a nonce, or a one-time checkout token issued at check-in.
- At minimum, use a signed secret embedded in the visitor’s check-in confirmation rather than just email + code.

### 4. [P2] Multi-org billing is not wired to the active organisation and can fail or target the wrong Stripe customer

Files:
- `src/contexts/OrgContext.tsx:73-104`
- `src/hooks/useSubscription.ts:76-92`
- `supabase/functions/check-subscription/index.ts:95-107`
- `supabase/functions/check-subscription/index.ts:136-193`
- `supabase/functions/customer-portal/index.ts:45-55`

Why this matters:
- The frontend clearly supports switching active organisations via `ssp_active_org_id`.
- But the subscription hook and billing edge functions do not take an org ID or use the active org context.
- They rely on `.single()` / `.maybeSingle()` membership lookups and Stripe customer lookup by email with `limit: 1`.
- For users with multiple active orgs, this can either fail outright or show/manage the wrong organisation’s billing state.

Evidence:
- Org switching is implemented in `OrgContext.tsx:73-104`.
- `useSubscription.ts:76-92` fetches one membership with `.maybeSingle()` and ignores the active org selection entirely.
- `check-subscription/index.ts:95-107` and `check-subscription/index.ts:177-193` do the same with `.single()`.
- `check-subscription/index.ts:136-157` and `customer-portal/index.ts:45-55` look up Stripe customers by email with `limit: 1`, not by the organisation’s stored Stripe customer ID.

Recommended fix:
- Thread `organisationId` through the billing UI and edge functions.
- Resolve billing from the selected organisation row, especially `stripe_customer_id` / `stripe_subscription_id`.
- Stop using email-based `customers.list(... limit: 1)` as the source of truth for org billing state.

## Re-Checked Areas

The deeper pass did not uncover a new client portal RLS leak:

- The detail pages fetch by raw `id`, but the underlying client portal RLS policies do appear to scope `projects`, `documents`, `rams_records`, `corrective_actions`, and `site_diary_entries` by organisation, permission flags, and allowed `project_ids`.

The offline conflict flow also looks substantially healthier than earlier snapshots:

- `SyncContext` now mounts `ConflictDialog`.
- `queue.ts` excludes `_conflict_requires_resolution` items from automatic retries.
- `sync.ts` honors `_force_overwrite`.

## Scope And Limits

- This was another static review only.
- I still did not run build, tests, lint, or typecheck because `node` and `npm` are not installed in this environment.

## Suggested Patch Order

1. Enforce induction completion server-side during public check-in.
2. Persist and validate required induction checklist acknowledgements.
3. Replace public email-based checkout with a stronger checkout token.
4. Make billing/subscription flows organisation-scoped instead of email-scoped.
