
-- ============================================================
-- Phase 4: Procurement Schedule
-- ============================================================

CREATE TABLE public.procurement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  category TEXT,

  supplier_name TEXT,
  contractor_id UUID REFERENCES public.contractor_companies(id),

  design_info_required_date DATE,
  order_date DATE,
  lead_time_weeks INTEGER,
  required_on_site_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,

  budget_value DECIMAL(12,2),
  order_value DECIMAL(12,2),
  purchase_order_number TEXT,

  status TEXT DEFAULT 'not_ordered',

  notes TEXT,
  linked_task_id UUID REFERENCES public.programme_tasks(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_procurement_item()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('not_ordered','enquiry_sent','quotes_received','ordered','delivered','cancelled') THEN
    RAISE EXCEPTION 'Invalid procurement status: %', NEW.status;
  END IF;
  IF NEW.category IS NOT NULL AND NEW.category NOT IN ('plant','materials','subcontract','specialist') THEN
    RAISE EXCEPTION 'Invalid procurement category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_procurement_item
  BEFORE INSERT OR UPDATE ON public.procurement_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_procurement_item();

CREATE TRIGGER update_procurement_items_updated_at
  BEFORE UPDATE ON public.procurement_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_procurement_project ON public.procurement_items(project_id);
CREATE INDEX idx_procurement_org ON public.procurement_items(organisation_id);
CREATE INDEX idx_procurement_status ON public.procurement_items(status);

-- RLS
ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view procurement items"
  ON public.procurement_items FOR SELECT
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can insert procurement items"
  ON public.procurement_items FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can update procurement items"
  ON public.procurement_items FOR UPDATE
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Admins can delete procurement items"
  ON public.procurement_items FOR DELETE
  USING (public.is_org_admin(auth.uid(), organisation_id));
