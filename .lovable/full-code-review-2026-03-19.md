# SiteSafe Pro Full Code Review

Date: 2026-03-19
Repo snapshot: `sitesafepro-main (4).zip`
Review type: Static review only

## Executive Summary

This pass focused on edge-function auth/authz, storage access, public upload flows, payments, invite flows, and AI-assisted document handling.

I found 8 issues worth patching, including 5 high-priority backend problems:

1. `send-whatsapp` is publicly callable and can send real WhatsApp templates without caller auth.
2. `check-compliance-doc` is publicly callable and can read contractor documents with service-role access, then forward them to the AI gateway.
3. `contractor-document-request` rotates upload tokens before proving the contractor belongs to the caller's organisation.
4. `send-notification` lets any active member send arbitrary links/content to arbitrary profile IDs.
5. `create-organisation` still treats any existing org owner as a platform admin for cross-user org creation.

## Findings

### 1. [P1] `send-whatsapp` has no caller authentication or organisation authorization

File: `supabase/functions/send-whatsapp/index.ts:28-208`

Why this matters:
- The function never checks an `Authorization` header or validates the caller before using the service-role client.
- Any external caller who knows an `organisationId` can attempt to send real WhatsApp template messages for that org, subject only to org config and rate limits.
- Because this hits the Meta API directly, this is both an abuse path and a cost/reputation risk.

Evidence:
- Request handling starts at `send-whatsapp/index.ts:28`.
- Inputs are accepted at `send-whatsapp/index.ts:52-60`.
- Service-role access starts at `send-whatsapp/index.ts:82`.
- The live Meta API call happens at `send-whatsapp/index.ts:184-194`.

Recommended fix:
- Require a verified caller identity or an internal service secret.
- If this is intended to be internal-only, reject all non-service calls explicitly.
- Add org-level authorization before sending messages.

### 2. [P1] `check-compliance-doc` is publicly callable and can exfiltrate files through the AI pipeline

File: `supabase/functions/check-compliance-doc/index.ts:49-253`

Why this matters:
- The function accepts `compliance_doc_id` and `organisation_id` from the request body without authenticating the caller.
- It then uses the service-role client to create a signed URL or download the underlying contractor document.
- The document contents are forwarded to `https://ai.gateway.lovable.dev/v1/chat/completions`.
- That means anyone who can obtain a valid document UUID can trigger privileged document reads and resend file contents to the AI vendor.

Evidence:
- Public request body handling is at `check-compliance-doc/index.ts:49-55`.
- Service-role storage reads happen at `check-compliance-doc/index.ts:127-135`.
- AI gateway forwarding happens at `check-compliance-doc/index.ts:253`.
- `contractor-upload` currently triggers this function with the anon key at `supabase/functions/contractor-upload/index.ts:188-193`, which confirms the endpoint is expected to accept anonymous traffic today.

Recommended fix:
- Require authenticated or signed internal calls.
- Verify the target doc belongs to the supplied org and that the caller is authorized for that org.
- Prefer an internal queue/job trigger instead of a public edge endpoint.

### 3. [P1] `contractor-document-request` mutates contractor upload tokens before checking tenant ownership

File: `supabase/functions/contractor-document-request/index.ts:70-114`

Why this matters:
- The function updates `contractor_companies.upload_token` using the service-role client before it verifies the caller's organisation membership.
- It also never checks that the target `contractor_id` belongs to the caller's organisation.
- A user from one org who learns another org's `contractor_id` can rotate that contractor's upload link and generate a fresh upload URL for the wrong tenant.

Evidence:
- Token rotation starts at `contractor-document-request/index.ts:73-85`.
- Caller org lookup happens only afterwards at `contractor-document-request/index.ts:92-101`.
- The request record is then written with the caller's org at `contractor-document-request/index.ts:104-114`, even though the contractor row was never tenant-checked first.

Recommended fix:
- Resolve the caller's active org first.
- Fetch the contractor by both `id` and `organisation_id`.
- Only rotate the upload token after that org ownership check passes.

### 4. [P1] `send-notification` allows any active member to send arbitrary email/WhatsApp content and links

File: `supabase/functions/send-notification/index.ts:107-236`

Why this matters:
- The only authorization check is "caller is an active member of this org".
- The caller can choose `recipientProfileId`, `type`, `data`, and `link`.
- The function does not confirm the recipient is part of the same organisation before sending.
- That gives any active member a built-in phishing/spam channel to send arbitrary links and templated messages through trusted org email/WhatsApp infrastructure.

Evidence:
- Caller-controlled fields are parsed at `send-notification/index.ts:107-116`.
- The only authz check is org membership at `send-notification/index.ts:123-138`.
- Recipient lookup is a raw profile fetch at `send-notification/index.ts:148-153`.
- The caller-supplied `link` is inserted into outbound messages at `send-notification/index.ts:115` and `send-notification/index.ts:236`.
- WhatsApp delivery is delegated at `send-notification/index.ts:195-207`.

Recommended fix:
- Gate this function behind role or permission checks.
- Validate that the recipient is eligible for the chosen notification type.
- Generate destination URLs server-side instead of accepting arbitrary links from the client.

### 5. [P1] `create-organisation` still lets any existing org owner create orgs for arbitrary user IDs

File: `supabase/functions/create-organisation/index.ts:54-68`

Why this matters:
- The comment says "platform admin", but the implementation treats "owner in any org" as enough to create an organisation for a different `userId`.
- That means any customer org owner can create organisations on behalf of arbitrary profile IDs, not just themselves.
- This can be abused for account/provisioning fraud, noisy profile creation, and trial/billing abuse.

Evidence:
- The cross-user bypass is at `create-organisation/index.ts:54-68`.
- The organization is then created with `owner_id: userId` at `create-organisation/index.ts:138`.

Recommended fix:
- Only allow self-service org creation, or use a real platform-admin allowlist/claim.
- Do not treat ordinary org ownership as platform-admin authority.

### 6. [P2] Multiple functions still trust the raw request `Origin` header for security-sensitive links

Files:
- `supabase/functions/customer-portal/index.ts:52-55`
- `supabase/functions/client-invite/index.ts:404-405`
- `supabase/functions/client-invite/index.ts:506-507`
- `supabase/functions/team-invite/index.ts:416`
- `supabase/functions/team-invite/index.ts:497-498`
- `supabase/functions/contractor-document-request/index.ts:140`

Why this matters:
- These functions build Stripe return URLs, invite URLs, and contractor upload URLs from `req.headers.get("origin")`.
- A spoofed origin can redirect users into a phishing domain while preserving a trusted email or Stripe flow.
- The repo already contains a safer helper in `supabase/functions/_shared/app-origin.ts`, but these call sites are still bypassing it.

Recommended fix:
- Replace all raw-origin URL construction with `getTrustedAppOrigin(req)`.
- Apply the same allowlist pattern already used in `create-checkout`.

### 7. [P2] `stripe-webhook` accepts unsigned events when `STRIPE_WEBHOOK_SECRET` is missing

File: `supabase/functions/stripe-webhook/index.ts:35-80`

Why this matters:
- If `STRIPE_WEBHOOK_SECRET` is unset, the function falls back to `JSON.parse(body)` and processes the event anyway.
- In that state, anyone who can hit the endpoint can forge subscription lifecycle events and change org billing status.
- Even if this is meant for development, the fallback is dangerous because it fails open rather than closed.

Evidence:
- Secret lookup is at `stripe-webhook/index.ts:35`.
- Verified handling is at `stripe-webhook/index.ts:58-69`.
- The insecure fallback is at `stripe-webhook/index.ts:79-80`.

Recommended fix:
- Refuse to start when the webhook secret is missing outside an explicitly gated local-dev mode.
- Fail closed instead of accepting unsigned payloads.

### 8. [P3] The "Founding 50" signup counter is still implemented as a read-modify-write race

File: `supabase/functions/create-organisation/index.ts:113-128`

Why this matters:
- The code reads `founding_fifty_count`, derives trial length, then writes back `currentCount + 1`.
- Concurrent signups can read the same value and both claim the same slot.
- That can over-assign the 180-day offer or undercount actual signups.

Evidence:
- Counter read is at `create-organisation/index.ts:113-121`.
- Counter update is at `create-organisation/index.ts:124-128`.

Recommended fix:
- Move this to a single SQL function or transactional increment.

## Re-Checked Areas

I re-checked a few areas that had been risky in earlier snapshots and did not find a new issue in this pass:

- `supabase/functions/create-checkout/index.ts` now allowlists Stripe price IDs and uses the trusted app-origin helper.
- `supabase/functions/get-signed-url/index.ts` now checks org membership and constrains non-export storage paths to `org/{org_id}/...`.
- `supabase/functions/check-subscription/index.ts` now handles trialing orgs before falling back to Stripe.
- The document workflow functions (`approve-document`, `reject-document`, `request-review`, `create-version`, `export-pdf`) now appear to have org-level authorization checks in place.

## Skill Notes

I used the available skills this way:

- `openai-docs`: checked whether this snapshot contains direct OpenAI product/API usage that needed current-doc validation. I did not find direct OpenAI integration in the app code, so there were no OpenAI-specific upgrade findings to add from that skill.
- `skill-creator`: used its structure guidance to keep this report concise, findings-first, and handoff-friendly for another agent/team.
- `skill-installer`: reviewed the installation path, but no additional skill installation was needed to complete this local static audit.

## Scope And Limits

- This was a static code review of the extracted repo snapshot only.
- I did not run the app, tests, lint, or typecheck because `node` and `npm` are not installed in this environment.
- I did not use browser-driven QA or deploy-time verification in this pass.

## Suggested Patch Order

1. Lock down `send-whatsapp`.
2. Lock down `check-compliance-doc`.
3. Fix `contractor-document-request` tenant authorization.
4. Harden `send-notification` permissions and server-generated links.
5. Fix `create-organisation` cross-user org creation rules.
6. Replace all raw `Origin` URL construction with the trusted helper.
7. Make `stripe-webhook` fail closed without a webhook secret.
8. Move the Founding 50 counter to an atomic DB operation.
