
-- Compliance requirement presets: org-level defaults per trade category
CREATE TABLE public.compliance_requirement_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  trade_category TEXT NOT NULL,
  required_doc_types TEXT[] NOT NULL DEFAULT '{}',
  min_public_liability TEXT DEFAULT NULL,
  min_employers_liability TEXT DEFAULT NULL,
  expiry_warning_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, trade_category)
);

-- Enable RLS
ALTER TABLE public.compliance_requirement_presets ENABLE ROW LEVEL SECURITY;

-- Policies: org members can read, admins can write
CREATE POLICY "Org members can view presets"
  ON public.compliance_requirement_presets FOR SELECT
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Admins can insert presets"
  ON public.compliance_requirement_presets FOR INSERT
  WITH CHECK (public.is_org_admin(auth.uid(), organisation_id));

CREATE POLICY "Admins can update presets"
  ON public.compliance_requirement_presets FOR UPDATE
  USING (public.is_org_admin(auth.uid(), organisation_id));

CREATE POLICY "Admins can delete presets"
  ON public.compliance_requirement_presets FOR DELETE
  USING (public.is_org_admin(auth.uid(), organisation_id));

-- Auto-update updated_at
CREATE TRIGGER update_compliance_presets_updated_at
  BEFORE UPDATE ON public.compliance_requirement_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
