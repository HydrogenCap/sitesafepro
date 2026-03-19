
-- ============================================================
-- Phase 1: Programme (Gantt Chart) — Tables, RLS, Triggers
-- ============================================================

-- 1. programme_tasks
CREATE TABLE public.programme_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.programme_tasks(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'task', -- validated by trigger

  -- Baseline dates (locked on programme approval)
  baseline_start DATE,
  baseline_finish DATE,

  -- Current planned dates
  planned_start DATE NOT NULL,
  planned_finish DATE NOT NULL,

  -- Actuals
  actual_start DATE,
  actual_finish DATE,

  -- Progress (0-100, validated by trigger)
  progress INTEGER NOT NULL DEFAULT 0,

  -- Status (validated by trigger)
  status TEXT NOT NULL DEFAULT 'not_started',

  -- Classification
  trade TEXT,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,

  -- Sorting
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Constraints
  early_start DATE,
  late_finish DATE,
  constraint_type TEXT,
  constraint_date DATE,

  -- Links
  assigned_contractor_id UUID REFERENCES public.contractor_companies(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. programme_dependencies
CREATE TABLE public.programme_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  from_task_id UUID NOT NULL REFERENCES public.programme_tasks(id) ON DELETE CASCADE,
  to_task_id UUID NOT NULL REFERENCES public.programme_tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'FS', -- validated by trigger
  lag INTEGER NOT NULL DEFAULT 0,
  UNIQUE(from_task_id, to_task_id)
);

-- 3. programme_baselines
CREATE TABLE public.programme_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_programme_tasks_project ON public.programme_tasks(project_id);
CREATE INDEX idx_programme_tasks_parent ON public.programme_tasks(parent_id);
CREATE INDEX idx_programme_tasks_org ON public.programme_tasks(organisation_id);
CREATE INDEX idx_programme_deps_from ON public.programme_dependencies(from_task_id);
CREATE INDEX idx_programme_deps_to ON public.programme_dependencies(to_task_id);
CREATE INDEX idx_programme_baselines_project ON public.programme_baselines(project_id);

-- ============================================================
-- Validation Triggers (instead of CHECK constraints)
-- ============================================================

-- Validate programme_tasks fields
CREATE OR REPLACE FUNCTION public.validate_programme_task()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.progress < 0 OR NEW.progress > 100 THEN
    RAISE EXCEPTION 'progress must be between 0 and 100, got %', NEW.progress;
  END IF;
  IF NEW.task_type NOT IN ('task', 'milestone', 'summary') THEN
    RAISE EXCEPTION 'Invalid task_type: %', NEW.task_type;
  END IF;
  IF NEW.status NOT IN ('not_started', 'in_progress', 'complete', 'delayed', 'at_risk') THEN
    RAISE EXCEPTION 'Invalid programme task status: %', NEW.status;
  END IF;
  IF NEW.constraint_type IS NOT NULL AND NEW.constraint_type NOT IN ('asap', 'must_start_on', 'must_finish_on') THEN
    RAISE EXCEPTION 'Invalid constraint_type: %', NEW.constraint_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_programme_task
  BEFORE INSERT OR UPDATE ON public.programme_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_programme_task();

-- Validate dependency type
CREATE OR REPLACE FUNCTION public.validate_programme_dependency()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('FS', 'SS', 'FF', 'SF') THEN
    RAISE EXCEPTION 'Invalid dependency type: %', NEW.type;
  END IF;
  IF NEW.from_task_id = NEW.to_task_id THEN
    RAISE EXCEPTION 'A task cannot depend on itself';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_programme_dependency
  BEFORE INSERT OR UPDATE ON public.programme_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.validate_programme_dependency();

-- Auto-update updated_at on programme_tasks
CREATE TRIGGER trg_programme_tasks_updated_at
  BEFORE UPDATE ON public.programme_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS Policies
-- ============================================================

-- programme_tasks
ALTER TABLE public.programme_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view programme tasks"
  ON public.programme_tasks FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers+ can create programme tasks"
  ON public.programme_tasks FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers+ can update programme tasks"
  ON public.programme_tasks FOR UPDATE
  USING (organisation_id = public.get_user_org_id())
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins+ can delete programme tasks"
  ON public.programme_tasks FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- programme_dependencies
ALTER TABLE public.programme_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view dependencies"
  ON public.programme_dependencies FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers+ can create dependencies"
  ON public.programme_dependencies FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers+ can update dependencies"
  ON public.programme_dependencies FOR UPDATE
  USING (organisation_id = public.get_user_org_id())
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins+ can delete dependencies"
  ON public.programme_dependencies FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- programme_baselines
ALTER TABLE public.programme_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view baselines"
  ON public.programme_baselines FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers+ can create baselines"
  ON public.programme_baselines FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins+ can delete baselines"
  ON public.programme_baselines FOR DELETE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members
      WHERE profile_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );
