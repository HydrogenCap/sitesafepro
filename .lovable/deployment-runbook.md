# SiteSafe Pro Deployment Runbook

## Purpose

This document is the Loveable handoff checklist for deploying the latest security, client portal, and offline sync fixes safely.

## Scope Of This Release

This release includes:

- Invite flow hardening for client, team, and contractor invites
- Signed URL access control fixes
- Offline conflict handling improvements
- Client portal document and RAMS viewing fixes
- Atomic organisation storage usage updates

## Prerequisites

Before deploying, confirm:

- You are deploying from the latest `main`
- Supabase project access is available
- Production environment variables are already configured
- A Node.js environment is available for app verification

## Database Migrations

Apply these migrations:

1. `supabase/migrations/20260319143000_increment_org_storage_usage.sql`
2. `supabase/migrations/20260319161500_client_portal_document_storage.sql`

Recommended command:

```bash
supabase db push
```

## Edge Function Deployment

Redeploy these functions after the migrations complete:

```bash
supabase functions deploy client-invite
supabase functions deploy team-invite
supabase functions deploy contractor-invite
supabase functions deploy get-signed-url
```

## App Verification

Run the standard project checks:

```bash
npm install
npm run build
npm test
npm run lint
```

If any command fails, stop and resolve that issue before continuing.

## Smoke Test Checklist

### Invite Flows

- Send and accept a team invite
- Send and accept a contractor invite for an email that already has an account
- Send and accept a client invite through `/client/accept-invite`
- Resend pending team and client invites and confirm the new links work
- Confirm already accepted invites cannot be reused

### Access Control

- Confirm client users can open allowed client document pages
- Confirm client users can open allowed client RAMS pages
- Confirm client users are redirected away from staff-only routes
- Confirm signed URLs work for valid in-org files
- Confirm signed URLs fail for cross-org access attempts

### Client Portal Permissions

- Invite a client with workforce visibility disabled and confirm workforce counts are hidden
- Invite a client with workforce visibility enabled and confirm workforce counts are visible

### Offline And Upload Behaviour

- Create an offline conflict and confirm the conflict UI appears
- Use "Keep Mine" and confirm sync can proceed
- Upload documents and confirm organisation storage usage increases correctly

## Post-Deploy Checks

- Review Supabase function logs for errors
- Check browser console for new frontend errors
- Confirm Stripe checkout and subscription flows still behave normally
- Confirm client portal document access works in the deployed environment

## Rollback Guidance

If deployment introduces regressions:

1. Stop further rollout activity
2. Review edge function logs and frontend errors
3. Revert the application deploy if needed
4. If the issue is migration-related, assess database rollback carefully before changing production data

## Notes

- This release was statically reviewed and patched in Codex
- Full runtime validation still depends on executing the commands above in a real Node.js environment
