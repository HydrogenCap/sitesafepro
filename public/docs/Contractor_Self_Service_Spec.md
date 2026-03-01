# SiteSafe Cloud — Contractor Self-Service & AI Document Checking
## Build-Ready Functional Specification v1.0

---

## 1. Executive Summary

This spec redesigns the SiteSafe Contractors module to enable **contractor self-service** (profile management, document upload, compliance tracking) with an **AI-assisted document verification workflow** and a **mandatory manual confirmation step** for legal defensibility.

### Existing Foundation (already built)
- `contractor_companies` table with compliance scoring
- `contractor_compliance_docs` table with verification fields
- `contractor_operatives` table with CSCS tracking
- `project_contractors` assignment table
- Token-based upload portal (`/contractor-upload/:token`)
- Internal compliance tab with upload/edit dialogs
- Document request email flow (Resend)
- 40+ compliance document types across Insurance/Certifications/Training/Accreditations

### What's New
- Contractor self-service portal (authenticated)
- AI document extraction & checking pipeline
- Structured review workflow (AI Check → Manual Review → Approved/Rejected)
- Full audit trail per document
- Configurable document requirements
- Expiry-driven compliance state machine
- Contractor-level & site-level compliance scores

---

## 2. Roles & Permissions

### 2.1 Role Hierarchy

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| **Super Admin** (owner) | Global | Full access, configure doc requirements, manage billing |
| **Compliance Admin** (admin) | Global | Manage all contractors, approve/reject docs, configure requirements |
| **Site Manager** (site_manager) | Assigned sites | View/approve contractors on their sites, trigger doc requests |
| **Contractor Admin** | Own company | Manage company profile, invite users, upload docs, view all sites |
| **Contractor User** (contractor) | Own company | Upload docs, view compliance status |
| **Client Viewer** (client_viewer) | Assigned projects | Read-only compliance dashboard |

### 2.2 Permission Matrix

| Action | Super Admin | Compliance Admin | Site Manager | Contractor Admin | Contractor User | Client Viewer |
|--------|:-----------:|:----------------:|:------------:|:----------------:|:---------------:|:-------------:|
| Configure doc requirements | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite contractors | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject documents | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ |
| View all contractors | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View site contractors | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Edit company profile | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Add operatives | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Upload compliance docs | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| View own compliance status | — | — | — | ✅ | ✅ | ❌ |
| Block contractor from site | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

*Site Managers can only approve/reject for contractors assigned to their sites.

### 2.3 Mapping to Existing Roles

The existing `member_role` enum (`owner`, `admin`, `site_manager`, `contractor`, `client_viewer`) already covers internal roles. Contractor Admin vs Contractor User is differentiated by a new `contractor_role` field on `contractor_operatives` (values: `admin` | `user` | `supervisor`).

---

## 3. Data Model

### 3.1 Existing Tables (modifications in **bold**)

#### `contractor_companies` — no schema changes needed
Already has: `compliance_status`, `compliance_score`, `is_approved`, `approved_by`, `required_doc_types[]`, `upload_token`.

#### `contractor_compliance_docs` — add columns:

```sql
ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  status text NOT NULL DEFAULT 'uploaded'
  CHECK (status IN ('missing','uploaded','ai_checking','needs_review','approved','rejected','expired','superseded'));

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  ai_check_id uuid REFERENCES document_ai_checks(id);

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  is_current boolean NOT NULL DEFAULT true;

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  version_number integer NOT NULL DEFAULT 1;

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  previous_version_id uuid REFERENCES contractor_compliance_docs(id);

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  rejection_reason text;

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  rejection_action_required text;

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  reviewed_by uuid REFERENCES profiles(id);

ALTER TABLE contractor_compliance_docs ADD COLUMN IF NOT EXISTS
  reviewed_at timestamptz;
```

#### `contractor_operatives` — add column:

```sql
ALTER TABLE contractor_operatives ADD COLUMN IF NOT EXISTS
  contractor_role text NOT NULL DEFAULT 'user'
  CHECK (contractor_role IN ('admin','user','supervisor'));
```

### 3.2 New Tables

#### `document_type_requirements`
Configurable requirements per contractor category and/or site.

```sql
CREATE TABLE document_type_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  doc_type text NOT NULL,                    -- compliance_doc_type enum value
  is_required boolean NOT NULL DEFAULT true,
  has_expiry boolean NOT NULL DEFAULT true,
  minimum_cover_amount numeric,              -- e.g. 5000000 for £5M
  cover_currency text DEFAULT 'GBP',
  applies_to_trades text[] DEFAULT '{}',     -- empty = all trades
  applies_to_site_ids uuid[] DEFAULT '{}',   -- empty = all sites
  expiry_warning_days integer[] DEFAULT '{30,14,7}',
  ai_auto_approve boolean NOT NULL DEFAULT false,
  ai_auto_approve_threshold numeric DEFAULT 0.95,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organisation_id, doc_type)
);
ALTER TABLE document_type_requirements ENABLE ROW LEVEL SECURITY;
```

#### `document_ai_checks`
Stores AI extraction results per document.

```sql
CREATE TABLE document_ai_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  compliance_doc_id uuid NOT NULL REFERENCES contractor_compliance_docs(id),
  ai_model text NOT NULL,                    -- e.g. 'gemini-2.5-flash'
  status text NOT NULL DEFAULT 'pending'     -- pending | processing | completed | failed
    CHECK (status IN ('pending','processing','completed','failed')),
  result text                                -- pass | needs_review | fail
    CHECK (result IS NULL OR result IN ('pass','needs_review','fail')),
  confidence_score numeric,                  -- 0.0 - 1.0
  extracted_fields jsonb DEFAULT '{}',       -- structured extraction
  validation_errors jsonb DEFAULT '[]',      -- array of {field, message, severity}
  summary text,                              -- human-readable summary
  raw_response jsonb,                        -- full AI response for debugging
  processing_time_ms integer,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE document_ai_checks ENABLE ROW LEVEL SECURITY;
```

**`extracted_fields` schema per doc type** (see §5 for details):

```jsonc
// Insurance
{
  "insurer_name": "Aviva",
  "policy_number": "POL-12345",
  "insured_party": "Smith Construction Ltd",
  "coverage_amount": 5000000,
  "coverage_currency": "GBP",
  "start_date": "2025-01-01",
  "end_date": "2026-01-01",
  "policy_type": "public_liability",
  "exclusions_detected": false
}

// CSCS Card
{
  "holder_name": "John Smith",
  "card_type": "blue_skilled",
  "card_number": "1234567890",
  "expiry_date": "2027-06-30",
  "registration_number": "REG-123"
}

// RAMS
{
  "contractor_name": "Smith Construction Ltd",
  "project_reference": "PRJ-001",
  "document_date": "2025-06-01",
  "version": "2.0",
  "signatures_present": true,
  "sections_found": ["risk_assessment", "method_statement", "emergency_procedures"]
}
```

#### `document_review_log`
Immutable audit trail for every review action.

```sql
CREATE TABLE document_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  compliance_doc_id uuid NOT NULL REFERENCES contractor_compliance_docs(id),
  action text NOT NULL CHECK (action IN ('uploaded','ai_check_started','ai_check_completed','approved','rejected','resubmission_requested','expired','superseded')),
  actor_id uuid REFERENCES profiles(id),     -- null for system/AI actions
  actor_type text NOT NULL DEFAULT 'user'     -- user | system | ai
    CHECK (actor_type IN ('user','system','ai')),
  previous_status text,
  new_status text,
  notes text,
  metadata jsonb DEFAULT '{}',               -- AI results summary, rejection reasons, etc.
  created_at timestamptz DEFAULT now()
);
ALTER TABLE document_review_log ENABLE ROW LEVEL SECURITY;
-- Immutable: no UPDATE or DELETE policies
```

#### `contractor_invitations`
Track contractor invitations with self-registration flow.

```sql
CREATE TABLE contractor_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id),
  contractor_company_id uuid REFERENCES contractor_companies(id),
  invited_by uuid NOT NULL REFERENCES profiles(id),
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  email text NOT NULL,
  company_name text,
  required_doc_types text[] DEFAULT '{}',
  message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contractor_invitations ENABLE ROW LEVEL SECURITY;
```

---

## 4. Document Status State Machine

```
                    ┌─────────────┐
                    │   MISSING   │ (no document uploaded for required type)
                    └──────┬──────┘
                           │ upload
                           ▼
                    ┌─────────────┐
                    │  UPLOADED   │
                    └──────┬──────┘
                           │ auto-trigger
                           ▼
                    ┌─────────────┐
                    │ AI_CHECKING │
                    └──────┬──────┘
                           │
                   ┌───────┼───────┐
                   │       │       │
                   ▼       ▼       ▼
              AI: PASS  AI: REVIEW  AI: FAIL
                   │       │       │
                   │       │       │
                   ▼       ▼       ▼
                    ┌─────────────┐
                    │NEEDS_REVIEW │ (ALL results go here unless auto-approve ON + PASS)
                    └──────┬──────┘
                           │
                   ┌───────┴───────┐
                   │               │
                   ▼               ▼
            ┌───────────┐   ┌──────────┐
            │  APPROVED │   │ REJECTED │
            └─────┬─────┘   └────┬─────┘
                  │              │ resubmit (→ new version → UPLOADED)
                  │              │
                  ▼              │
            ┌───────────┐       │
            │  EXPIRED  │◄──── (cron job checks expiry_date daily)
            └───────────┘
                  │ resubmit (→ new version → UPLOADED)

  On new version upload:
    - Previous version → SUPERSEDED
    - New version → UPLOADED (→ AI_CHECKING)
```

### Transition Rules

| From | To | Trigger | Actor |
|------|----|---------|-------|
| MISSING | UPLOADED | File upload | Contractor |
| UPLOADED | AI_CHECKING | Auto (immediate) | System |
| AI_CHECKING | NEEDS_REVIEW | AI check complete | AI |
| AI_CHECKING | APPROVED | AI PASS + auto-approve ON + confidence ≥ threshold | System |
| NEEDS_REVIEW | APPROVED | Manual approval | Internal user |
| NEEDS_REVIEW | REJECTED | Manual rejection | Internal user |
| APPROVED | EXPIRED | expiry_date < today | Cron |
| REJECTED | UPLOADED | Contractor re-uploads | Contractor |
| EXPIRED | UPLOADED | Contractor re-uploads | Contractor |
| ANY (current) | SUPERSEDED | New version uploaded | System |

---

## 5. AI Extraction & Checking Rules

### 5.1 Implementation

- **Edge Function**: `supabase/functions/check-compliance-doc/index.ts`
- **Model**: Lovable AI Gateway → `google/gemini-2.5-flash` (fast, multimodal, no API key needed)
- **Input**: Signed URL of uploaded file (PDF/image)
- **Output**: Structured JSON stored in `document_ai_checks.extracted_fields`

### 5.2 Per Document Type Rules

#### Insurance Documents (public_liability, employers_liability, professional_indemnity, car_insurance, plant_insurance)

| Field | Extract | Validate |
|-------|---------|----------|
| `insurer_name` | ✅ | Non-empty |
| `policy_number` | ✅ | Non-empty |
| `insured_party` | ✅ | Fuzzy match against `contractor_companies.company_name` or `trading_name` (Levenshtein ≤ 3 or contains match) |
| `coverage_amount` | ✅ | ≥ `document_type_requirements.minimum_cover_amount` |
| `start_date` | ✅ | ≤ today |
| `end_date` | ✅ | > today (not expired) |
| `exclusions_detected` | ✅ (best effort) | Flag if detected |

**Result logic:**
- PASS: All fields extracted, all validations pass, confidence ≥ 0.85
- NEEDS_REVIEW: Some fields missing or confidence < 0.85
- FAIL: Expired, coverage below minimum, or insured party mismatch

#### CSCS / Competency Cards

| Field | Extract | Validate |
|-------|---------|----------|
| `holder_name` | ✅ | Fuzzy match against operative or company contact name |
| `card_type` | ✅ | Map to known CSCS card types |
| `card_number` | ✅ | Non-empty |
| `expiry_date` | ✅ | > today |

#### RAMS

| Field | Extract | Validate |
|-------|---------|----------|
| `contractor_name` | ✅ | Match against contractor company |
| `project_reference` | ✅ | Match against assigned project (if possible) |
| `document_date` | ✅ | Non-empty |
| `version` | ✅ | Non-empty |
| `signatures_present` | ✅ | True preferred |
| `sections_found` | ✅ | Check for risk_assessment + method_statement minimum |

#### Accreditations (CHAS, SafeContractor, SMAS, Constructionline, ISO)

| Field | Extract | Validate |
|-------|---------|----------|
| `accreditation_body` | ✅ | Match expected body for doc type |
| `company_name` | ✅ | Match contractor |
| `certificate_number` | ✅ | Non-empty |
| `valid_from` | ✅ | ≤ today |
| `valid_until` | ✅ | > today |

### 5.3 Confidence Score

Overall confidence = average of per-field confidences. Each field gets:
- 1.0 = clearly extracted and validated
- 0.7 = extracted but validation uncertain
- 0.3 = partially extracted
- 0.0 = not found

### 5.4 AI Prompt Template (simplified)

```
You are a UK construction compliance document analyser.
Extract the following fields from this {doc_type} document.
Return ONLY valid JSON matching this schema: {schema}
For each field, include a confidence score 0-1.
Flag any concerns (expired, coverage too low, name mismatch).
The contractor company name is: "{company_name}".
The minimum required coverage is: £{min_cover}.
Today's date is: {today}.
```

---

## 6. UX Flows

### 6.1 Contractor Onboarding (< 5 mins, mobile-first)

**Entry points:**
1. Email invitation link → `/contractor-register/:token`
2. Existing upload portal → `/contractor-upload/:token` (enhanced)

**Steps:**
1. **Welcome screen** — Company name pre-filled from invitation, SiteSafe branding
2. **Create account** — Email + password (or magic link). Name, phone.
3. **Company details** — Pre-filled where possible. Trade, VAT (optional), address.
4. **What's needed** — Checklist of required documents with status indicators
5. **Upload** — One-tap camera/file upload per document type. Progress indicators.
6. **Done** — Summary of what was uploaded, what's still needed, what happens next.

### 6.2 Contractor Dashboard (post-login)

```
┌──────────────────────────────────────┐
│  🏗️ Smith Construction Ltd          │
│  Compliance: 75% ████████░░         │
│                                      │
│  ⚠️ 2 documents need attention       │
│  ✅ 6 approved                       │
│  ⏰ 1 expiring in 14 days           │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ What's Missing               │   │
│  │ • Employers Liability  [Upload]│   │
│  │ • CSCS Card (J.Smith) [Upload]│   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ Recent Activity              │   │
│  │ • Public Liability → Approved │   │
│  │ • CHAS → AI Checking...      │   │
│  │ • Prof Indemnity → Rejected  │   │
│  │   "Coverage below £1M min"   │   │
│  │   [Resubmit]                 │   │
│  └──────────────────────────────┘   │
│                                      │
│  Assigned Sites: Riverside, Phase 2  │
└──────────────────────────────────────┘
```

### 6.3 Document Upload Flow

1. Contractor taps "Upload" on a document type
2. Camera/file picker opens (accept PDF, JPG, PNG)
3. File uploads to Supabase Storage → `compliance-docs/{orgId}/contractors/{contractorId}/...`
4. Status → **UPLOADED** → immediately triggers AI check
5. Status → **AI_CHECKING** (spinner shown, ~5-15 seconds)
6. AI completes → Status → **NEEDS_REVIEW** (or auto-approved if configured)
7. Contractor sees: "Document submitted — awaiting review"
8. Internal user gets notification

### 6.4 Internal Review Flow

1. Site Manager / Admin sees notification: "New document awaiting review"
2. Opens review panel showing:
   - Document preview (PDF/image viewer)
   - AI extraction summary (extracted fields in a table)
   - AI confidence score + result (PASS/NEEDS_REVIEW/FAIL)
   - AI flagged concerns (highlighted in amber/red)
   - Contractor & company details for cross-reference
3. Reviewer chooses:
   - **Approve** → Status → APPROVED, contractor notified
   - **Reject** → Must enter reason + required action → Status → REJECTED, contractor notified with reason
   - **Request Resubmission** → Same as reject but softer language
4. All actions logged to `document_review_log`

### 6.5 Document Statuses (UI)

| Status | Badge Colour | Icon | Contractor Sees | Internal Sees |
|--------|-------------|------|-----------------|---------------|
| Missing | Grey | ○ | "Not uploaded" | "Missing" |
| Uploaded | Blue | ↑ | "Processing..." | "Uploaded" |
| AI Checking | Blue/pulse | ⟳ | "Checking..." | "AI Checking" |
| Needs Review | Amber | ⏳ | "Under review" | "Needs Review" + AI summary |
| Approved | Green | ✓ | "Approved" | "Approved" + who/when |
| Rejected | Red | ✗ | "Rejected" + reason + [Resubmit] | "Rejected" + reason |
| Expired | Red/outline | ⏰ | "Expired" + [Upload new] | "Expired" |
| Superseded | Grey/strikethrough | — | (hidden, accessible in history) | "Superseded" |

---

## 7. Compliance Scoring

### 7.1 Per-Document Score
- APPROVED & not expired = 1.0
- NEEDS_REVIEW = 0.5
- UPLOADED / AI_CHECKING = 0.25
- MISSING / REJECTED / EXPIRED = 0.0

### 7.2 Contractor Compliance Score (per site)

```
score = (sum of required doc scores) / (count of required docs) × 100
```

Only considers docs in `document_type_requirements` that apply to the contractor's trade and the specific site.

### 7.3 Contractor Global Score

Average across all assigned sites, weighted by number of requirements.

### 7.4 Blocked From Site

A contractor is **blocked** if ANY of these are true:
- Public Liability Insurance is not APPROVED
- Employers Liability Insurance is not APPROVED (if has employees)
- Any required document is EXPIRED or REJECTED for > 14 days
- `is_approved` on `contractor_companies` is false

---

## 8. Notification Rules

| Event | Contractor | Site Manager | Compliance Admin |
|-------|:----------:|:------------:|:----------------:|
| Document uploaded | — | ✅ (email + in-app) | ✅ (in-app) |
| AI check complete | ✅ (in-app) | ✅ (in-app) | — |
| Document approved | ✅ (email + in-app) | — | — |
| Document rejected | ✅ (email + in-app) | — | — |
| Expiry in 30 days | ✅ (email) | ✅ (in-app) | ✅ (email digest) |
| Expiry in 14 days | ✅ (email) | ✅ (email + in-app) | ✅ (email) |
| Expiry in 7 days | ✅ (email + in-app) | ✅ (email + in-app) | ✅ (email) |
| Document expired | ✅ (email + in-app) | ✅ (email + in-app) | ✅ (email) |
| Contractor blocked | ✅ (email) | ✅ (email + in-app) | ✅ (email + in-app) |
| Invitation sent | ✅ (email) | — | — |

---

## 9. Admin Configuration UI

### 9.1 Document Requirements Manager (`/settings` → "Contractor Compliance" tab)

- Table of all document types with columns:
  - Name | Required | Has Expiry | Min Coverage | Applies To (trades) | AI Auto-Approve
- Edit inline or via dialog
- Add custom document types
- Drag to reorder

### 9.2 Expiry Settings

- Warning windows: configurable array (default `[30, 14, 7]`)
- Auto-block threshold: days after expiry before blocking (default `0`)

### 9.3 AI Settings

- Global toggle: "Enable AI document checking" (default ON)
- Per doc-type: "Allow AI auto-approve" (default OFF)
- Auto-approve confidence threshold: 0.80 - 1.00 (default 0.95)

### 9.4 Rejection Templates

Pre-defined rejection reasons (editable):
- "Coverage amount below minimum requirement of £{amount}"
- "Document has expired on {date}"
- "Company name on document does not match registered name"
- "Document is not legible / too low resolution"
- "Wrong document type uploaded"
- "Missing required information: {fields}"

---

## 10. Edge Cases & Abuse Cases

| Scenario | Handling |
|----------|----------|
| Contractor uploads wrong file type | Client-side validation (PDF/image only, max 10MB). Server rejects others. |
| Contractor uploads someone else's certificate | AI checks insured party / holder name against contractor. Flagged as NEEDS_REVIEW. |
| Same document uploaded twice | Deduplicate by file hash. Warn contractor. |
| AI service unavailable | Status stays UPLOADED. Retry with exponential backoff (3 attempts). After 3 fails → NEEDS_REVIEW with note "AI check unavailable". |
| Contractor edits profile to match fraudulent doc | Audit trail captures original company name at time of AI check. Review log is immutable. |
| Document expires between upload and review | If expiry_date < today at review time, reviewer is warned. Cannot approve expired doc. |
| Bulk upload (10+ docs at once) | Queue AI checks. Process max 3 concurrently per contractor. Show progress. |
| Contractor account deactivated | Documents remain for audit. Access revoked. `is_active = false`. |
| Re-invitation after rejection | New invitation token. Old docs preserved. Contractor can resubmit. |
| Storage quota exceeded | Check org `storage_used_bytes` vs tier limit before upload. Reject with clear message. |

---

## 11. Build Plan

### Phase 1: MVP (2-3 weeks)
**Goal: Contractors can self-register, upload docs, and internal users can review.**

- [ ] DB migration: new tables + column additions
- [ ] Contractor invitation flow (email + token + registration page)
- [ ] Contractor self-service dashboard (view compliance status, upload docs)
- [ ] Document status state machine (without AI — manual review only)
- [ ] Internal review panel (approve/reject with reasons)
- [ ] `document_review_log` audit trail
- [ ] Expiry cron job enhancement (existing `check-document-expiry` updated)
- [ ] Basic notifications (email on upload, approval, rejection)

### Phase 2: AI Integration (1-2 weeks)
**Goal: AI checks documents automatically before manual review.**

- [ ] `check-compliance-doc` edge function (Gemini 2.5 Flash via Lovable AI)
- [ ] `document_ai_checks` table + integration
- [ ] Auto-trigger AI check on upload
- [ ] AI results displayed in review panel
- [ ] AI extraction field display with confidence indicators
- [ ] Optional auto-approve setting

### Phase 3: Polish & Configuration (1-2 weeks)
**Goal: Admin configuration, mobile UX, and notifications.**

- [ ] `document_type_requirements` admin UI
- [ ] Configurable expiry warnings
- [ ] Rejection templates
- [ ] Mobile-optimised upload flow (camera integration)
- [ ] "What's missing" checklist for contractors
- [ ] Notification preferences per user
- [ ] Contractor compliance dashboard for client viewers
- [ ] Bulk document request enhancement

### Phase 4: Advanced (future)
- [ ] SMS/WhatsApp notifications for expiry
- [ ] Contractor site supervisor role
- [ ] Document version comparison view
- [ ] Compliance reporting & analytics dashboards
- [ ] API for external compliance platforms (CHAS, Constructionline)
- [ ] QR code for site-gate compliance check

---

## 12. Definition of Done Checklist

### Per Feature
- [ ] Functional on mobile (375px viewport)
- [ ] Works offline-capable (upload queues if no signal)
- [ ] RLS policies cover all new tables
- [ ] Audit trail entry created for every state change
- [ ] Error states handled with user-friendly messages
- [ ] Loading states shown during async operations
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Tested with real UK insurance PDF samples

### Overall
- [ ] Contractor can register via invitation in < 5 minutes
- [ ] Contractor can upload a document and see AI results in < 30 seconds
- [ ] Internal user can review and approve/reject with full AI context
- [ ] Expired documents automatically flagged and contractor notified
- [ ] Complete audit trail from upload → AI check → review → approval
- [ ] No contractor can see another contractor's data
- [ ] No contractor can approve their own documents
- [ ] All document files stored in Supabase Storage with org-scoped paths
- [ ] Manual confirmation is ALWAYS required unless explicit auto-approve is enabled by admin

---

## Appendix A: RLS Policy Templates

```sql
-- document_ai_checks: org members can view, system can insert/update
CREATE POLICY "Org members can view AI checks"
  ON document_ai_checks FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Service can manage AI checks"
  ON document_ai_checks FOR ALL
  USING (true) WITH CHECK (true);
  -- Applied via service_role key in edge function only

-- document_review_log: immutable, org members can view, internal users can insert
CREATE POLICY "Org members can view review log"
  ON document_review_log FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Internal users can create review entries"
  ON document_review_log FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());
  -- No UPDATE or DELETE policies (immutable)
```

## Appendix B: Edge Function Signatures

```typescript
// POST /check-compliance-doc
{
  compliance_doc_id: string;  // UUID
  org_id: string;             // UUID
}
// Returns: { ok: boolean; check_id: string; result: 'pass'|'needs_review'|'fail'; summary: string }

// POST /review-compliance-doc
{
  compliance_doc_id: string;
  org_id: string;
  action: 'approve' | 'reject' | 'request_resubmission';
  notes?: string;
  rejection_reason?: string;
  rejection_action_required?: string;
}
// Returns: { ok: boolean; new_status: string }
```
