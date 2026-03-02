
-- ============================================================
-- Phase 3: Drawings Register & RFIs
-- ============================================================

-- Drawings register
CREATE TABLE public.drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  drawing_number TEXT NOT NULL,
  title TEXT NOT NULL,
  discipline TEXT,  -- architectural | structural | mechanical | electrical | civil | landscape

  current_revision TEXT,
  status TEXT DEFAULT 'information',

  scale TEXT,
  paper_size TEXT,

  file_path TEXT,
  file_name TEXT,

  issued_by TEXT,
  issued_date DATE,
  ifc_date DATE,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drawing revisions
CREATE TABLE public.drawing_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,

  revision TEXT NOT NULL,
  status TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT,
  issued_by TEXT,
  issued_date DATE,
  revision_description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RFIs
CREATE TABLE public.rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  rfi_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  discipline TEXT,
  priority TEXT DEFAULT 'normal',

  raised_by UUID REFERENCES auth.users(id),
  assigned_to_name TEXT,
  assigned_to_email TEXT,

  raised_date DATE DEFAULT CURRENT_DATE,
  required_by DATE,
  response_date DATE,

  status TEXT DEFAULT 'open',
  response TEXT,

  cost_impact BOOLEAN DEFAULT false,
  time_impact BOOLEAN DEFAULT false,
  linked_variation_id UUID REFERENCES public.variations(id),
  linked_drawing_ids UUID[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_drawing()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('preliminary','information','coordination','construction','as_built','superseded') THEN
    RAISE EXCEPTION 'Invalid drawing status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_drawing
  BEFORE INSERT OR UPDATE ON public.drawings
  FOR EACH ROW EXECUTE FUNCTION public.validate_drawing();

CREATE OR REPLACE FUNCTION public.validate_rfi()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','pending_response','answered','closed','void') THEN
    RAISE EXCEPTION 'Invalid RFI status: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('low','normal','high','critical') THEN
    RAISE EXCEPTION 'Invalid RFI priority: %', NEW.priority;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_rfi
  BEFORE INSERT OR UPDATE ON public.rfis
  FOR EACH ROW EXECUTE FUNCTION public.validate_rfi();

-- Updated_at triggers
CREATE TRIGGER update_drawings_updated_at
  BEFORE UPDATE ON public.drawings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rfis_updated_at
  BEFORE UPDATE ON public.rfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_drawings_project ON public.drawings(project_id);
CREATE INDEX idx_drawings_org ON public.drawings(organisation_id);
CREATE INDEX idx_drawing_revisions_drawing ON public.drawing_revisions(drawing_id);
CREATE INDEX idx_rfis_project ON public.rfis(project_id);
CREATE INDEX idx_rfis_org ON public.rfis(organisation_id);

-- RLS
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;

-- Drawings policies
CREATE POLICY "Org members can view drawings"
  ON public.drawings FOR SELECT
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Managers can insert drawings"
  ON public.drawings FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Managers can update drawings"
  ON public.drawings FOR UPDATE
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Admins can delete drawings"
  ON public.drawings FOR DELETE
  USING (public.is_org_admin(auth.uid(), organisation_id));

-- Drawing revisions policies
CREATE POLICY "Org members can view drawing revisions"
  ON public.drawing_revisions FOR SELECT
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can insert drawing revisions"
  ON public.drawing_revisions FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can update drawing revisions"
  ON public.drawing_revisions FOR UPDATE
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Admins can delete drawing revisions"
  ON public.drawing_revisions FOR DELETE
  USING (public.is_org_admin(auth.uid(), organisation_id));

-- RFIs policies
CREATE POLICY "Org members can view rfis"
  ON public.rfis FOR SELECT
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can insert rfis"
  ON public.rfis FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can update rfis"
  ON public.rfis FOR UPDATE
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Admins can delete rfis"
  ON public.rfis FOR DELETE
  USING (public.is_org_admin(auth.uid(), organisation_id));
