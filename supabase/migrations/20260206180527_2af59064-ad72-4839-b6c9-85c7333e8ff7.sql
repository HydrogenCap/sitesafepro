-- Phase 7: Permits to Work, Inspections, and Incident Reporting

-- Permit types enum
CREATE TYPE public.permit_type AS ENUM (
  'hot_work',
  'confined_space',
  'excavation',
  'electrical_isolation',
  'working_at_height',
  'roof_work',
  'demolition',
  'lifting_operations',
  'general'
);

-- Permit status enum
CREATE TYPE public.permit_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'active',
  'completed',
  'cancelled',
  'expired'
);

-- Inspection type enum
CREATE TYPE public.inspection_type AS ENUM (
  'scaffold',
  'excavation',
  'lifting_equipment',
  'electrical',
  'fire_safety',
  'housekeeping',
  'ppe_compliance',
  'general_site'
);

-- Inspection result enum
CREATE TYPE public.inspection_result AS ENUM (
  'pass',
  'fail',
  'requires_action',
  'not_applicable'
);

-- Incident severity enum
CREATE TYPE public.incident_severity AS ENUM (
  'near_miss',
  'minor_injury',
  'major_injury',
  'dangerous_occurrence',
  'fatality'
);

-- Incident status enum
CREATE TYPE public.incident_status AS ENUM (
  'reported',
  'under_investigation',
  'action_required',
  'closed',
  'riddor_reportable'
);

-- Permits to Work table
CREATE TABLE public.permits_to_work (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  permit_number TEXT NOT NULL,
  permit_type permit_type NOT NULL DEFAULT 'general',
  status permit_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  work_to_be_done TEXT NOT NULL,
  hazards_identified TEXT,
  control_measures TEXT,
  ppe_required TEXT[],
  requested_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  valid_from TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permit signatures table
CREATE TABLE public.permit_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  permit_id UUID NOT NULL REFERENCES public.permits_to_work(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  signature_type TEXT NOT NULL, -- 'requester', 'approver', 'receiver', 'closer'
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  inspection_type inspection_type NOT NULL DEFAULT 'general_site',
  inspection_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  inspector_id UUID REFERENCES public.profiles(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_inspection_date DATE,
  overall_result inspection_result,
  notes TEXT,
  corrective_actions TEXT,
  photos TEXT[],
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inspection items/checklist
CREATE TABLE public.inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  question TEXT NOT NULL,
  result inspection_result,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Incidents table
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  incident_number TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'near_miss',
  status incident_status NOT NULL DEFAULT 'reported',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  incident_date DATE NOT NULL,
  incident_time TIME,
  reported_by UUID REFERENCES public.profiles(id),
  injured_person_name TEXT,
  injured_person_company TEXT,
  injured_person_occupation TEXT,
  injury_description TEXT,
  body_part_affected TEXT,
  immediate_actions TEXT,
  root_cause TEXT,
  corrective_actions TEXT,
  is_riddor_reportable BOOLEAN DEFAULT false,
  riddor_reference TEXT,
  riddor_reported_at TIMESTAMP WITH TIME ZONE,
  investigation_notes TEXT,
  investigation_completed_at TIMESTAMP WITH TIME ZONE,
  investigated_by UUID REFERENCES public.profiles(id),
  photos TEXT[],
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Incident witnesses table
CREATE TABLE public.incident_witnesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  witness_name TEXT NOT NULL,
  witness_company TEXT,
  witness_contact TEXT,
  witness_statement TEXT,
  statement_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permits_to_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_witnesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permits_to_work
CREATE POLICY "Users can view permits in their organisation"
  ON public.permits_to_work FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create permits"
  ON public.permits_to_work FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers can update permits"
  ON public.permits_to_work FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

-- RLS Policies for permit_signatures
CREATE POLICY "Users can view signatures in their organisation"
  ON public.permit_signatures FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can add signatures"
  ON public.permit_signatures FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

-- RLS Policies for inspections
CREATE POLICY "Users can view inspections in their organisation"
  ON public.inspections FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create inspections"
  ON public.inspections FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers can update inspections"
  ON public.inspections FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

-- RLS Policies for inspection_items
CREATE POLICY "Users can view inspection items in their organisation"
  ON public.inspection_items FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can manage inspection items"
  ON public.inspection_items FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can update inspection items"
  ON public.inspection_items FOR UPDATE
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can delete inspection items"
  ON public.inspection_items FOR DELETE
  USING (organisation_id = get_user_org_id());

-- RLS Policies for incidents
CREATE POLICY "Users can view incidents in their organisation"
  ON public.incidents FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can report incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can update incidents"
  ON public.incidents FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

-- RLS Policies for incident_witnesses
CREATE POLICY "Users can view witnesses in their organisation"
  ON public.incident_witnesses FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can add witnesses"
  ON public.incident_witnesses FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can update witnesses"
  ON public.incident_witnesses FOR UPDATE
  USING (organisation_id = get_user_org_id());

-- Create indexes for better performance
CREATE INDEX idx_permits_organisation ON public.permits_to_work(organisation_id);
CREATE INDEX idx_permits_project ON public.permits_to_work(project_id);
CREATE INDEX idx_permits_status ON public.permits_to_work(status);
CREATE INDEX idx_inspections_organisation ON public.inspections(organisation_id);
CREATE INDEX idx_inspections_project ON public.inspections(project_id);
CREATE INDEX idx_inspections_type ON public.inspections(inspection_type);
CREATE INDEX idx_incidents_organisation ON public.incidents(organisation_id);
CREATE INDEX idx_incidents_project ON public.incidents(project_id);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);

-- Add update triggers
CREATE TRIGGER update_permits_updated_at
  BEFORE UPDATE ON public.permits_to_work
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();