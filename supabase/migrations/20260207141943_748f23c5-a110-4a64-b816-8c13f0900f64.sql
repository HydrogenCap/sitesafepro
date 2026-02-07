-- ============================================
-- RAMS Activity Library (pre-loaded templates)
-- ============================================

CREATE TABLE public.rams_activity_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  -- NULL organisation_id = system-wide default template
  -- Non-null = org-specific custom template
  
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  
  -- Pre-loaded hazards for this activity
  default_hazards JSONB NOT NULL DEFAULT '[]',
  
  -- Pre-loaded method statement steps
  default_method_steps JSONB NOT NULL DEFAULT '[]',
  
  -- Pre-loaded PPE requirements
  default_ppe JSONB NOT NULL DEFAULT '[]',
  
  -- Legislation references
  legislation_refs TEXT[],
  
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Generated RAMS records
-- ============================================

CREATE TABLE public.rams_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Header information
  title TEXT NOT NULL,
  rams_reference TEXT NOT NULL,
  revision_number INTEGER NOT NULL DEFAULT 1,
  
  -- Site details
  site_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  client_name TEXT,
  principal_contractor TEXT,
  
  -- Dates
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  review_date DATE,
  
  -- People
  prepared_by UUID NOT NULL REFERENCES public.profiles(id),
  prepared_by_name TEXT NOT NULL,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_by_name TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_by_name TEXT,
  
  -- Work description
  work_description TEXT NOT NULL,
  work_location TEXT,
  work_duration TEXT,
  
  -- Structured content
  risk_assessments JSONB NOT NULL DEFAULT '[]',
  method_statements JSONB NOT NULL DEFAULT '[]',
  
  -- PPE summary (aggregated from all method statements)
  ppe_requirements JSONB NOT NULL DEFAULT '[]',
  
  -- Emergency information
  emergency_procedures TEXT,
  nearest_hospital TEXT,
  site_emergency_contact TEXT,
  
  -- Status & workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'superseded')),
  
  -- Link to the generated PDF in documents table
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  
  -- Source activities used (from library)
  source_activity_ids UUID[] DEFAULT '{}',
  
  -- AI assistance used
  ai_assisted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Signature records for RAMS
CREATE TABLE public.rams_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rams_id UUID NOT NULL REFERENCES public.rams_records(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  signer_id UUID REFERENCES public.profiles(id),
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('prepared_by', 'reviewed_by', 'approved_by', 'acknowledged_by')),
  signer_company TEXT,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rams_activity_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rams_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rams_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for Activity Library
CREATE POLICY "Users can view system and org library items"
ON public.rams_activity_library FOR SELECT
USING (organisation_id IS NULL OR organisation_id = get_user_org_id());

CREATE POLICY "Admins can insert org library items"
ON public.rams_activity_library FOR INSERT
WITH CHECK (organisation_id = get_user_org_id() AND organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

CREATE POLICY "Admins can update org library items"
ON public.rams_activity_library FOR UPDATE
USING (organisation_id = get_user_org_id() AND organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

CREATE POLICY "Admins can delete org library items"
ON public.rams_activity_library FOR DELETE
USING (organisation_id = get_user_org_id() AND organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- RLS policies for RAMS Records
CREATE POLICY "Users can view RAMS in their org"
ON public.rams_records FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can create RAMS"
ON public.rams_records FOR INSERT
WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Users can update RAMS"
ON public.rams_records FOR UPDATE
USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can delete RAMS"
ON public.rams_records FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- RLS policies for RAMS Signatures
CREATE POLICY "Users can view RAMS signatures in their org"
ON public.rams_signatures FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can add RAMS signatures"
ON public.rams_signatures FOR INSERT
WITH CHECK (organisation_id = get_user_org_id());

-- Indexes for performance
CREATE INDEX idx_rams_library_org ON public.rams_activity_library(organisation_id);
CREATE INDEX idx_rams_library_category ON public.rams_activity_library(category);
CREATE INDEX idx_rams_records_org ON public.rams_records(organisation_id);
CREATE INDEX idx_rams_records_project ON public.rams_records(project_id);
CREATE INDEX idx_rams_records_status ON public.rams_records(status);
CREATE INDEX idx_rams_sigs_rams ON public.rams_signatures(rams_id);

-- Add 'rams' to document_category enum
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'rams';