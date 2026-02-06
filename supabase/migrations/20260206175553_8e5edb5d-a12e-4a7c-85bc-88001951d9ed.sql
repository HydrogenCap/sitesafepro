-- Site Induction Templates (per project)
CREATE TABLE public.site_induction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Site Safety Induction',
  description TEXT,
  video_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Induction checklist items/questions
CREATE TABLE public.site_induction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.site_induction_templates(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Induction completion records
CREATE TABLE public.site_induction_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.site_induction_templates(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT,
  visitor_company TEXT,
  visitor_phone TEXT,
  signature_data TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  site_visit_id UUID REFERENCES public.site_visits(id)
);

-- Enable RLS
ALTER TABLE public.site_induction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_induction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_induction_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for site_induction_templates
CREATE POLICY "Users can view templates in their organisation"
  ON public.site_induction_templates FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create templates"
  ON public.site_induction_templates FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id() AND organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin', 'site_manager')
    AND status = 'active'
  ));

CREATE POLICY "Site managers can update templates"
  ON public.site_induction_templates FOR UPDATE
  USING (organisation_id = get_user_org_id() AND organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin', 'site_manager')
    AND status = 'active'
  ));

CREATE POLICY "Admins can delete templates"
  ON public.site_induction_templates FOR DELETE
  USING (organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ));

-- RLS Policies for site_induction_items
CREATE POLICY "Users can view items in their organisation"
  ON public.site_induction_items FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can manage items"
  ON public.site_induction_items FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can update items"
  ON public.site_induction_items FOR UPDATE
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can delete items"
  ON public.site_induction_items FOR DELETE
  USING (organisation_id = get_user_org_id() AND organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin', 'site_manager')
    AND status = 'active'
  ));

-- RLS Policies for site_induction_completions
CREATE POLICY "Users can view completions in their organisation"
  ON public.site_induction_completions FOR SELECT
  USING (organisation_id = get_user_org_id());

-- Allow anyone to insert (for public check-in flow via edge function)
-- We'll use edge function for public insertions

-- Indexes for performance
CREATE INDEX idx_induction_templates_project ON public.site_induction_templates(project_id);
CREATE INDEX idx_induction_templates_org ON public.site_induction_templates(organisation_id);
CREATE INDEX idx_induction_items_template ON public.site_induction_items(template_id);
CREATE INDEX idx_induction_completions_project ON public.site_induction_completions(project_id);
CREATE INDEX idx_induction_completions_template ON public.site_induction_completions(template_id);
CREATE INDEX idx_induction_completions_visitor ON public.site_induction_completions(visitor_email);

-- Triggers for updated_at
CREATE TRIGGER update_site_induction_templates_updated_at
  BEFORE UPDATE ON public.site_induction_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();