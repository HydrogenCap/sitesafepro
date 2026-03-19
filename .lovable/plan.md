

# Security Fixes — Codex Review P0/P1

## Summary

Four security and logic issues identified. Here is the plan to fix each.

---

## Fix 1 — [P0] `create-organisation`: Add caller auth check

**Problem**: The function accepts an arbitrary `userId` from the request body and creates an owner membership with no verification that the caller is that user.

**Fix**: Extract the JWT from the `Authorization` header, verify it with `supabaseAdmin.auth.getUser()`, and assert that the authenticated user's ID matches the `userId` in the body. Reject the request with 403 if they don't match.

**File**: `supabase/functions/create-organisation/index.ts`

---

## Fix 2 — [P1] `check-subscription`: Respect trial status from the database

**Problem**: When no Stripe customer exists, the function returns `subscribed: false` with no tier — even though newly signed-up orgs are in a valid `trialing` state with an enterprise tier stored in the `organisations` table.

**Fix**: Before querying Stripe, look up the user's organisation membership and check the `organisations` table for `subscription_status` and `trial_ends_at`. If the org is `trialing` and the trial hasn't expired, return `subscribed: true` with the stored tier and trial end date. Only fall through to Stripe if not in an active trial.

**File**: `supabase/functions/check-subscription/index.ts`

---

## Fix 3 — [P1] `AdminPanel.tsx`: Use the owner email, not the admin's ID

**Problem**: `handleCreateOrg` passes `user!.id` (the admin's own ID) as the `userId` to `create-organisation`, making the admin the owner instead of the intended user specified by "Owner Email".

**Fix**: Before calling the edge function, look up the profile by the entered `ownerEmail` to get their `id`. If no profile exists, show an error telling the admin the user must have an account first. Pass the looked-up profile ID as `userId`.

**File**: `src/pages/AdminPanel.tsx`

---

## Fix 4 — [P1] `create-checkout`: Validate priceId against allowlist

**Problem**: The client-supplied `priceId` is forwarded directly to Stripe with no validation, allowing a tampered request to purchase any price in the Stripe account.

**Fix**: Define an allowlist of valid price IDs (sourced from the existing `STRIPE_PRODUCTS` config or hardcoded in the function). Reject the request with a 400 error if the submitted `priceId` is not in the allowlist.

**File**: `supabase/functions/create-checkout/index.ts`

---

## Technical Details

| Issue | Severity | File | Change Type |
|-------|----------|------|-------------|
| Missing auth on org creation | P0 | `create-organisation/index.ts` | Add JWT verification + userId match |
| Trial orgs shown as inactive | P1 | `check-subscription/index.ts` | Add DB trial lookup before Stripe query |
| Admin becomes org owner | P1 | `AdminPanel.tsx` | Look up profile by email, pass correct ID |
| Unbounded priceId | P1 | `create-checkout/index.ts` | Add price allowlist validation |

