
-- I2: Add riddor_submitted_by to incidents (riddor_reported_at already exists)
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS riddor_submitted_by uuid REFERENCES public.profiles(id);

-- I4: Add missing audit event types to activity_type enum
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'incident_reported';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'incident_updated';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'incident_closed';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'riddor_reported';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'permit_approved';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'permit_rejected';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'permit_cancelled';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'contractor_removed';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'exemption_granted';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'rams_approved';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'rams_superseded';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'go_live_activated';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'inspection_completed';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'inspection_overdue';

-- I6: Permit requester/approver separation trigger
CREATE OR REPLACE FUNCTION public.enforce_permit_approver_separation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.approved_by = NEW.requested_by THEN
    RAISE EXCEPTION 'Permit approver must be a different person than the requester (safety-critical role separation)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS enforce_permit_approver_separation ON public.permits_to_work;
CREATE TRIGGER enforce_permit_approver_separation
  BEFORE UPDATE ON public.permits_to_work
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.enforce_permit_approver_separation();

-- I7: Add hs_file to document_category enum
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'hs_file';

-- I8: Create site_hazards relational table
CREATE TABLE public.site_hazards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL REFERENCES public.profiles(id),
  severity text NOT NULL DEFAULT 'high',
  status text NOT NULL DEFAULT 'open',
  location text,
  description text NOT NULL,
  photo_storage_path text,
  photo_mime_type text,
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id),
  resolution_notes text,
  reported_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_hazards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view hazards in their org"
  ON public.site_hazards FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Members can create hazards"
  ON public.site_hazards FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can update hazards"
  ON public.site_hazards FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_members.organisation_id FROM organisation_members
    WHERE organisation_members.profile_id = auth.uid()
    AND organisation_members.role = ANY(ARRAY['owner'::member_role, 'admin'::member_role, 'site_manager'::member_role])
    AND organisation_members.status = 'active'::member_status
  ));

-- I8: Create site_actions relational table (for offline-captured corrective actions)
CREATE TABLE public.site_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES public.profiles(id),
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  title text NOT NULL,
  description text,
  location text,
  due_date date,
  assigned_to_name text,
  photo_storage_path text,
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site actions in their org"
  ON public.site_actions FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Members can create site actions"
  ON public.site_actions FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can update site actions"
  ON public.site_actions FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_members.organisation_id FROM organisation_members
    WHERE organisation_members.profile_id = auth.uid()
    AND organisation_members.role = ANY(ARRAY['owner'::member_role, 'admin'::member_role, 'site_manager'::member_role])
    AND organisation_members.status = 'active'::member_status
  ));
