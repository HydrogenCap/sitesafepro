
-- Meeting minutes table
CREATE TABLE public.meeting_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  meeting_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'progress',
  chairperson TEXT,
  minute_taker TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  apologies JSONB DEFAULT '[]'::jsonb,
  distribution JSONB DEFAULT '[]'::jsonb,
  agenda_items JSONB DEFAULT '[]'::jsonb,
  general_notes TEXT,
  next_meeting_date DATE,
  next_meeting_location TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_meeting_minutes()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('draft','issued','approved') THEN
    RAISE EXCEPTION 'Invalid meeting minutes status: %', NEW.status;
  END IF;
  IF NEW.meeting_type NOT IN ('progress','design','safety','pre_start','handover','ad_hoc') THEN
    RAISE EXCEPTION 'Invalid meeting type: %', NEW.meeting_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_meeting_minutes
  BEFORE INSERT OR UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.validate_meeting_minutes();

CREATE TRIGGER trg_set_org_meeting_minutes
  BEFORE INSERT ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id();

CREATE TRIGGER trg_updated_at_meeting_minutes
  BEFORE UPDATE ON public.meeting_minutes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique meeting number per project
CREATE UNIQUE INDEX idx_meeting_minutes_project_number ON public.meeting_minutes(project_id, meeting_number);

-- RLS policies
CREATE POLICY "Members can view meeting minutes" ON public.meeting_minutes
  FOR SELECT USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can create meeting minutes" ON public.meeting_minutes
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Members can update meeting minutes" ON public.meeting_minutes
  FOR UPDATE USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Managers can delete meeting minutes" ON public.meeting_minutes
  FOR DELETE USING (public.can_manage_documents(organisation_id));
