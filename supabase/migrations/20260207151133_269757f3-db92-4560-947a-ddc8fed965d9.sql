-- COSHH Register for tracking hazardous substances (CDM 2015 / COSHH Regs 2002)
CREATE TABLE public.coshh_substances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Substance details
  product_name TEXT NOT NULL,
  manufacturer TEXT,
  substance_type TEXT NOT NULL,
  
  -- Hazard classification (GHS pictograms)
  hazard_pictograms TEXT[] DEFAULT '{}',
  hazard_statements TEXT[] DEFAULT '{}',
  precautionary_statements TEXT[] DEFAULT '{}',
  
  -- Risk details
  route_of_exposure TEXT[] DEFAULT '{}',
  health_effects TEXT,
  
  -- Controls
  control_measures TEXT[] NOT NULL DEFAULT '{}',
  ppe_required TEXT[] DEFAULT '{}',
  
  -- Storage
  storage_location TEXT,
  storage_requirements TEXT,
  quantity_on_site TEXT,
  
  -- Safety Data Sheet
  sds_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  sds_available BOOLEAN DEFAULT false,
  
  -- Exposure limits
  workplace_exposure_limit TEXT,
  health_surveillance_required BOOLEAN DEFAULT false,
  health_surveillance_details TEXT,
  
  -- Emergency
  first_aid_measures TEXT,
  spill_procedure TEXT,
  fire_fighting_measures TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  added_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coshh_substances ENABLE ROW LEVEL SECURITY;

-- View policy for all org members
CREATE POLICY "Users can view COSHH in their org"
ON public.coshh_substances FOR SELECT
USING (organisation_id = get_user_org_id());

-- Insert policy for site managers and above
CREATE POLICY "Site managers can create COSHH entries"
ON public.coshh_substances FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

-- Update policy for site managers and above
CREATE POLICY "Site managers can update COSHH entries"
ON public.coshh_substances FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

-- Delete policy for admins only
CREATE POLICY "Admins can delete COSHH entries"
ON public.coshh_substances FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- Client portal users can view COSHH if they have document access
CREATE POLICY "Client users can view COSHH"
ON public.coshh_substances FOR SELECT
USING (EXISTS (
  SELECT 1 FROM client_portal_users cpu
  WHERE cpu.profile_id = auth.uid()
  AND cpu.is_active = true
  AND cpu.organisation_id = coshh_substances.organisation_id
  AND cpu.can_view_documents = true
  AND (array_length(cpu.project_ids, 1) IS NULL OR coshh_substances.project_id = ANY(cpu.project_ids))
));

CREATE INDEX idx_coshh_project ON public.coshh_substances(project_id);
CREATE INDEX idx_coshh_org ON public.coshh_substances(organisation_id);

-- Trigger for updated_at
CREATE TRIGGER update_coshh_substances_updated_at
BEFORE UPDATE ON public.coshh_substances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();