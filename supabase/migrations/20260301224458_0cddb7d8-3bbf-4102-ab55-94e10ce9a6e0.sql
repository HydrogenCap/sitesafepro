
-- Fix search_path on all new validation functions
CREATE OR REPLACE FUNCTION validate_compliance_doc_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('missing','uploaded','ai_checking','needs_review','approved','rejected','expired','superseded') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION validate_contractor_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contractor_role NOT IN ('admin','user','supervisor') THEN
    RAISE EXCEPTION 'Invalid contractor_role: %', NEW.contractor_role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

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
$$ LANGUAGE plpgsql SET search_path = public;

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
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION validate_invitation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending','accepted','expired','revoked') THEN
    RAISE EXCEPTION 'Invalid invitation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
