-- Create site access codes table (QR codes for projects)
CREATE TABLE public.site_access_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  name TEXT NOT NULL DEFAULT 'Main Entrance',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create site visits table (check-in/check-out records)
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_access_code_id UUID NOT NULL REFERENCES public.site_access_codes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_company TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  purpose TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMP WITH TIME ZONE,
  profile_id UUID REFERENCES public.profiles(id),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  has_signed_induction BOOLEAN DEFAULT false,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.site_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_access_codes
CREATE POLICY "Users can view access codes in their organisation"
ON public.site_access_codes FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create access codes"
ON public.site_access_codes FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Site managers can update access codes"
ON public.site_access_codes FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can delete access codes"
ON public.site_access_codes FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- RLS policies for site_visits
CREATE POLICY "Users can view visits in their organisation"
ON public.site_visits FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Anyone can create visits via public check-in"
ON public.site_visits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Site managers can update visits"
ON public.site_visits FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

-- Create indexes for performance
CREATE INDEX idx_site_access_codes_project ON public.site_access_codes(project_id);
CREATE INDEX idx_site_access_codes_code ON public.site_access_codes(code);
CREATE INDEX idx_site_visits_project ON public.site_visits(project_id);
CREATE INDEX idx_site_visits_checked_in ON public.site_visits(checked_in_at DESC);
CREATE INDEX idx_site_visits_active ON public.site_visits(site_access_code_id) WHERE checked_out_at IS NULL;