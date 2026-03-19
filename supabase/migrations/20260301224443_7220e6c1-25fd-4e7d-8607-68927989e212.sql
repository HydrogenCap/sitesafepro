
-- =============================================
-- Phase 1: Contractor Self-Service & AI Doc Checking
-- =============================================

-- 1. Add new columns to contractor_compliance_docs
ALTER TABLE contractor_compliance_docs 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS previous_version_id uuid REFERENCES contractor_compliance_docs(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejection_action_required text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Add validation trigger for status values
CREATE OR REPLACE FUNCTION validate_compliance_doc_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('missing','uploaded','ai_checking','needs_review','approved','rejected','expired','superseded') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_compliance_doc_status
  BEFORE INSERT OR UPDATE ON contractor_compliance_docs
  FOR EACH ROW EXECUTE FUNCTION validate_compliance_doc_status();

-- 2. Add contractor_role to contractor_operatives
ALTER TABLE contractor_operatives
  ADD COLUMN IF NOT EXISTS contractor_role text NOT NULL DEFAULT 'user';

CREATE OR REPLACE FUNCTION validate_contractor_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contractor_role NOT IN ('admin','user','supervisor') THEN
    RAISE EXCEPTION 'Invalid contractor_role: %', NEW.contractor_role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_contractor_role
  BEFORE INSERT OR UPDATE ON contractor_operatives
  FOR EACH ROW EXECUTE FUNCTION validate_contractor_role();

-- 3. Document Type Requirements (configurable per org)
CREATE TABLE document_type_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  has_expiry boolean NOT NULL DEFAULT true,
  minimum_cover_amount numeric,
  cover_currency text DEFAULT 'GBP',
  applies_to_trades text[] DEFAULT '{}',
  applies_to_site_ids uuid[] DEFAULT '{}',
  expiry_warning_days integer[] DEFAULT '{30,14,7}',
  ai_auto_approve boolean NOT NULL DEFAULT false,
  ai_auto_approve_threshold numeric DEFAULT 0.95,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organisation_id, doc_type)
);

ALTER TABLE document_type_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view requirements"
  ON document_type_requirements FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can manage requirements"
  ON document_type_requirements FOR ALL
  USING (organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
      AND role IN ('owner','admin')
      AND status = 'active'
  ));

-- 4. Document AI Checks
CREATE TABLE document_ai_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  compliance_doc_id uuid NOT NULL REFERENCES contractor_compliance_docs(id) ON DELETE CASCADE,
  ai_model text NOT NULL DEFAULT 'gemini-2.5-flash',
  status text NOT NULL DEFAULT 'pending',
  result text,
  confidence_score numeric,
  extracted_fields jsonb DEFAULT '{}',
  validation_errors jsonb DEFAULT '[]',
  summary text,
  raw_response jsonb,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE document_ai_checks ENABLE ROW LEVEL SECURITY;

-- Validation trigger for ai check status
CREATE OR REPLACE FUNCTION validate_ai_check_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending','processing','completed','failed') THEN
    RAISE EXCEPTION 'Invalid AI check status: %', NEW.status;
  END IF;
  IF NEW.result IS NOT NULL AND NEW.result NOT IN ('pass','needs_review','fail') THEN
    RAISE EXCEPTION 'Invalid AI check result: %', NEW.result;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_ai_check_status
  BEFORE INSERT OR UPDATE ON document_ai_checks
  FOR EACH ROW EXECUTE FUNCTION validate_ai_check_status();

CREATE POLICY "Org members can view AI checks"
  ON document_ai_checks FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create AI checks"
  ON document_ai_checks FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can update AI checks"
  ON document_ai_checks FOR UPDATE
  USING (organisation_id = get_user_org_id());

-- Add ai_check_id FK to compliance docs
ALTER TABLE contractor_compliance_docs
  ADD COLUMN IF NOT EXISTS ai_check_id uuid REFERENCES document_ai_checks(id);

-- 5. Document Review Log (immutable audit trail)
CREATE TABLE document_review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  compliance_doc_id uuid NOT NULL REFERENCES contractor_compliance_docs(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES profiles(id),
  actor_type text NOT NULL DEFAULT 'user',
  previous_status text,
  new_status text,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_review_log ENABLE ROW LEVEL SECURITY;

-- Validation triggers
CREATE OR REPLACE FUNCTION validate_review_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action NOT IN ('uploaded','ai_check_started','ai_check_completed','approved','rejected','resubmission_requested','expired','superseded') THEN
    RAISE EXCEPTION 'Invalid review log action: %', NEW.action;
  END IF;
  IF NEW.actor_type NOT IN ('user','system','ai') THEN
    RAISE EXCEPTION 'Invalid actor_type: %', NEW.actor_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_review_log
  BEFORE INSERT ON document_review_log
  FOR EACH ROW EXECUTE FUNCTION validate_review_log();

-- Immutable: only SELECT and INSERT
CREATE POLICY "Org members can view review log"
  ON document_review_log FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Org members can create review entries"
  ON document_review_log FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

-- 6. Contractor Invitations
CREATE TABLE contractor_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  contractor_company_id uuid REFERENCES contractor_companies(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES profiles(id),
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending',
  email text NOT NULL,
  company_name text,
  required_doc_types text[] DEFAULT '{}',
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contractor_invitations ENABLE ROW LEVEL SECURITY;

-- Validation trigger for invitation status
CREATE OR REPLACE FUNCTION validate_invitation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending','accepted','expired','revoked') THEN
    RAISE EXCEPTION 'Invalid invitation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_invitation_status
  BEFORE INSERT OR UPDATE ON contractor_invitations
  FOR EACH ROW EXECUTE FUNCTION validate_invitation_status();

CREATE POLICY "Admins can manage invitations"
  ON contractor_invitations FOR ALL
  USING (organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
      AND role IN ('owner','admin','site_manager')
      AND status = 'active'
  ));

CREATE POLICY "Invited user can view their invitation"
  ON contractor_invitations FOR SELECT
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR accepted_by = auth.uid()
  );

-- Allow unauthenticated access to validate tokens (via service role in edge function)
-- No anon policy needed; token validation will happen in edge function with service role

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_docs_status ON contractor_compliance_docs(status);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_is_current ON contractor_compliance_docs(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_compliance_docs_expiry ON contractor_compliance_docs(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_checks_compliance_doc ON document_ai_checks(compliance_doc_id);
CREATE INDEX IF NOT EXISTS idx_ai_checks_status ON document_ai_checks(status);
CREATE INDEX IF NOT EXISTS idx_review_log_compliance_doc ON document_review_log(compliance_doc_id);
CREATE INDEX IF NOT EXISTS idx_review_log_created ON document_review_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON contractor_invitations(invite_token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invitations_email ON contractor_invitations(email);
CREATE INDEX IF NOT EXISTS idx_doc_requirements_org ON document_type_requirements(organisation_id);
