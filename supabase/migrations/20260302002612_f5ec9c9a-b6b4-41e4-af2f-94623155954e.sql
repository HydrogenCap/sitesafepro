
-- =====================================================
-- Phase 2: Budget & Cost Management
-- =====================================================

-- 1. Project Budget (one per project)
CREATE TABLE public.project_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  contract_sum DECIMAL(12,2),
  contract_currency TEXT NOT NULL DEFAULT 'GBP',
  contract_type TEXT, -- JCT_SBC | JCT_Minor | NEC4_ECC | NEC4_ShortForm | Bespoke

  approved_variations DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_contract_sum DECIMAL(12,2),
  anticipated_final_cost DECIMAL(12,2),
  contingency DECIMAL(12,2),

  certified_to_date DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_to_date DECIMAL(12,2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(project_id)
);

ALTER TABLE public.project_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view budget"
  ON public.project_budget FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers can create budget"
  ON public.project_budget FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers can update budget"
  ON public.project_budget FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete budget"
  ON public.project_budget FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin')
        AND status = 'active'
    )
  );

CREATE TRIGGER update_project_budget_updated_at
  BEFORE UPDATE ON public.project_budget
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Budget Items (cost plan line items)
CREATE TABLE public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  code TEXT,
  description TEXT NOT NULL,
  category TEXT, -- prelims | groundworks | structure | envelope | mep | finishes | external | contingency

  budget_value DECIMAL(12,2),
  committed_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  certified_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  forecast_final DECIMAL(12,2),

  contractor_id UUID REFERENCES public.contractor_companies(id),
  linked_task_id UUID REFERENCES public.programme_tasks(id) ON DELETE SET NULL,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view budget items"
  ON public.budget_items FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers can create budget items"
  ON public.budget_items FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers can update budget items"
  ON public.budget_items FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete budget items"
  ON public.budget_items FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin')
        AND status = 'active'
    )
  );

CREATE TRIGGER update_budget_items_updated_at
  BEFORE UPDATE ON public.budget_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Variations
CREATE TABLE public.variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  variation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  type TEXT NOT NULL DEFAULT 'addition', -- addition | omission | substitution
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted | under_review | approved | rejected | withdrawn

  is_compensation_event BOOLEAN NOT NULL DEFAULT FALSE,
  early_warning_reference TEXT,

  quoted_value DECIMAL(12,2),
  agreed_value DECIMAL(12,2),
  time_impact_days INTEGER NOT NULL DEFAULT 0,

  submitted_date DATE,
  approved_date DATE,

  submitted_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),

  linked_task_id UUID REFERENCES public.programme_tasks(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view variations"
  ON public.variations FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers can create variations"
  ON public.variations FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers can update variations"
  ON public.variations FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete variations"
  ON public.variations FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin')
        AND status = 'active'
    )
  );

CREATE TRIGGER update_variations_updated_at
  BEFORE UPDATE ON public.variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for variations
CREATE OR REPLACE FUNCTION public.validate_variation()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('addition','omission','substitution') THEN
    RAISE EXCEPTION 'variation type must be addition, omission, or substitution';
  END IF;
  IF NEW.status NOT IN ('submitted','under_review','approved','rejected','withdrawn') THEN
    RAISE EXCEPTION 'variation status must be submitted, under_review, approved, rejected, or withdrawn';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_variation
  BEFORE INSERT OR UPDATE ON public.variations
  FOR EACH ROW EXECUTE FUNCTION public.validate_variation();

-- 4. Payment Applications
CREATE TABLE public.payment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  application_number INTEGER NOT NULL,
  valuation_date DATE NOT NULL,
  submission_date DATE,
  due_date DATE,

  gross_value DECIMAL(12,2),
  retention DECIMAL(12,2),
  net_value DECIMAL(12,2),
  previous_certified DECIMAL(12,2),
  this_application DECIMAL(12,2),

  certified_value DECIMAL(12,2),
  certified_date DATE,

  paid_value DECIMAL(12,2),
  paid_date DATE,

  status TEXT NOT NULL DEFAULT 'draft', -- draft | submitted | certified | disputed | paid
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view payment applications"
  ON public.payment_applications FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers can create payment applications"
  ON public.payment_applications FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers can update payment applications"
  ON public.payment_applications FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin','site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete payment applications"
  ON public.payment_applications FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner','admin')
        AND status = 'active'
    )
  );

CREATE TRIGGER update_payment_applications_updated_at
  BEFORE UPDATE ON public.payment_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for payment applications
CREATE OR REPLACE FUNCTION public.validate_payment_application()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','submitted','certified','disputed','paid') THEN
    RAISE EXCEPTION 'payment application status must be draft, submitted, certified, disputed, or paid';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_application
  BEFORE INSERT OR UPDATE ON public.payment_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_application();

-- Indexes
CREATE INDEX idx_budget_items_project ON public.budget_items(project_id);
CREATE INDEX idx_budget_items_org ON public.budget_items(organisation_id);
CREATE INDEX idx_variations_project ON public.variations(project_id);
CREATE INDEX idx_variations_status ON public.variations(status);
CREATE INDEX idx_payment_applications_project ON public.payment_applications(project_id);
CREATE INDEX idx_project_budget_org ON public.project_budget(organisation_id);
