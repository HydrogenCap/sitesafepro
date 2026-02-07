-- ============================================
-- Contractor company profiles
-- ============================================
CREATE TABLE public.contractor_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  -- Company details
  company_name TEXT NOT NULL,
  trading_name TEXT,
  company_registration_number TEXT,
  vat_number TEXT,
  
  -- Contact
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  office_address TEXT,
  website TEXT,
  
  -- Trade classification
  primary_trade TEXT NOT NULL,
  secondary_trades TEXT[] DEFAULT '{}',
  
  -- Tax status
  tax_status TEXT CHECK (tax_status IN ('limited_company', 'sole_trader', 'partnership', 'cis_registered')),
  utr_number TEXT,
  
  -- Compliance status (auto-calculated)
  compliance_status TEXT DEFAULT 'incomplete' CHECK (compliance_status IN ('compliant', 'expiring_soon', 'expired', 'incomplete')),
  compliance_score INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  internal_rating INTEGER CHECK (internal_rating BETWEEN 1 AND 5),
  
  is_active BOOLEAN DEFAULT true,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Contractor compliance documents
-- ============================================
CREATE TYPE public.compliance_doc_type AS ENUM (
  -- Insurance
  'car_insurance',
  'public_liability',
  'employers_liability',
  'professional_indemnity',
  'plant_insurance',
  
  -- Personal certifications
  'cscs_card',
  'gas_safe',
  'niceic',
  'part_p',
  'fgas',
  'ipaf',
  'pasma',
  'cpcs',
  'cisrs',
  'nvq',
  'first_aid',
  'fire_marshal',
  'sssts',
  'smsts',
  'asbestos_awareness',
  'confined_spaces',
  'working_at_height',
  'manual_handling',
  'abrasive_wheels',
  'face_fit',
  
  -- Company accreditations
  'chas',
  'safe_contractor',
  'constructionline',
  'smas',
  'iso_45001',
  'iso_9001',
  'iso_14001',
  
  -- Other
  'dbs_check',
  'right_to_work',
  'other'
);

CREATE TABLE public.contractor_compliance_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  contractor_company_id UUID REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  doc_type public.compliance_doc_type NOT NULL,
  
  reference_number TEXT,
  provider TEXT,
  cover_amount TEXT,
  
  issue_date DATE,
  expiry_date DATE,
  
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  file_path TEXT,
  
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  
  reminder_sent_30_days BOOLEAN DEFAULT false,
  reminder_sent_7_days BOOLEAN DEFAULT false,
  reminder_sent_expired BOOLEAN DEFAULT false,
  
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT at_least_one_owner CHECK (
    contractor_company_id IS NOT NULL OR profile_id IS NOT NULL
  )
);

-- ============================================
-- Contractor operatives
-- ============================================
CREATE TABLE public.contractor_operatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  contractor_company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  
  profile_id UUID REFERENCES public.profiles(id),
  
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  trade TEXT NOT NULL,
  role_on_site TEXT CHECK (role_on_site IN ('operative', 'supervisor', 'foreman', 'apprentice')),
  
  cscs_card_number TEXT,
  cscs_card_type TEXT CHECK (cscs_card_type IN ('green_labourer', 'blue_skilled', 'gold_supervisor', 'black_manager', 'red_trainee', 'white_professional')),
  cscs_expiry_date DATE,
  
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  known_medical_conditions TEXT,
  blood_type TEXT,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Project-contractor assignments
-- ============================================
CREATE TABLE public.project_contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contractor_company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  scope_of_works TEXT,
  trade TEXT NOT NULL,
  
  start_date DATE,
  estimated_end_date DATE,
  
  order_value DECIMAL(12,2),
  purchase_order_number TEXT,
  
  required_doc_types public.compliance_doc_type[] DEFAULT '{}',
  
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'removed')),
  
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, contractor_company_id)
);

-- RLS on all tables
ALTER TABLE public.contractor_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_compliance_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_operatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contractors ENABLE ROW LEVEL SECURITY;

-- Contractor companies policies
CREATE POLICY "Users can view contractors in their org"
ON public.contractor_companies FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can insert contractors"
ON public.contractor_companies FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can update contractors"
ON public.contractor_companies FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can delete contractors"
ON public.contractor_companies FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- Compliance docs policies
CREATE POLICY "Users can view compliance docs in their org"
ON public.contractor_compliance_docs FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can insert compliance docs"
ON public.contractor_compliance_docs FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
) OR uploaded_by = auth.uid());

CREATE POLICY "Admins can update compliance docs"
ON public.contractor_compliance_docs FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can delete compliance docs"
ON public.contractor_compliance_docs FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- Operatives policies
CREATE POLICY "Users can view operatives in their org"
ON public.contractor_operatives FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can insert operatives"
ON public.contractor_operatives FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can update operatives"
ON public.contractor_operatives FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can delete operatives"
ON public.contractor_operatives FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- Project contractors policies
CREATE POLICY "Users can view project contractors in their org"
ON public.project_contractors FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can insert project contractors"
ON public.project_contractors FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can update project contractors"
ON public.project_contractors FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

CREATE POLICY "Admins can delete project contractors"
ON public.project_contractors FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- Indexes
CREATE INDEX idx_contractor_companies_org ON public.contractor_companies(organisation_id);
CREATE INDEX idx_contractor_companies_trade ON public.contractor_companies(primary_trade);
CREATE INDEX idx_contractor_companies_status ON public.contractor_companies(compliance_status);
CREATE INDEX idx_compliance_docs_company ON public.contractor_compliance_docs(contractor_company_id);
CREATE INDEX idx_compliance_docs_profile ON public.contractor_compliance_docs(profile_id);
CREATE INDEX idx_compliance_docs_expiry ON public.contractor_compliance_docs(expiry_date);
CREATE INDEX idx_compliance_docs_type ON public.contractor_compliance_docs(doc_type);
CREATE INDEX idx_operatives_company ON public.contractor_operatives(contractor_company_id);
CREATE INDEX idx_project_contractors_project ON public.project_contractors(project_id);
CREATE INDEX idx_project_contractors_company ON public.project_contractors(contractor_company_id);

-- Triggers for updated_at
CREATE TRIGGER update_contractor_companies_updated_at
  BEFORE UPDATE ON public.contractor_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractor_compliance_docs_updated_at
  BEFORE UPDATE ON public.contractor_compliance_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractor_operatives_updated_at
  BEFORE UPDATE ON public.contractor_operatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();