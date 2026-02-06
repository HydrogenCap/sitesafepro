-- Add is_live status to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- Create project compliance requirements table
CREATE TABLE public.project_compliance_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL, -- 'f10', 'asbestos_survey', 'pci'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'uploaded', 'not_required', 'generated'
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  not_required_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, requirement_type)
);

-- Enable RLS
ALTER TABLE public.project_compliance_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view requirements in their organisation"
ON public.project_compliance_requirements
FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create requirements"
ON public.project_compliance_requirements
FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM organisation_members
  WHERE profile_id = auth.uid() 
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Site managers can update requirements"
ON public.project_compliance_requirements
FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM organisation_members
  WHERE profile_id = auth.uid() 
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

-- Create trigger for updated_at
CREATE TRIGGER update_project_compliance_requirements_updated_at
  BEFORE UPDATE ON public.project_compliance_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create generated site documents tracking table
CREATE TABLE public.project_generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'induction_register', 'rams_register', 'permit_to_work'
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES public.profiles(id),
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES public.profiles(id),
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view generated docs in their organisation"
ON public.project_generated_documents
FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create generated docs"
ON public.project_generated_documents
FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM organisation_members
  WHERE profile_id = auth.uid() 
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Users can update generated docs for signing"
ON public.project_generated_documents
FOR UPDATE
USING (organisation_id = get_user_org_id());