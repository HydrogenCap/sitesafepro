-- Create site diary entries table
CREATE TABLE public.site_diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  entry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  
  -- Weather section
  weather_morning TEXT,
  weather_afternoon TEXT,
  temperature_high INTEGER,
  temperature_low INTEGER,
  weather_conditions TEXT[] DEFAULT '{}',
  weather_impact TEXT,
  
  -- Workforce section
  workforce_entries JSONB NOT NULL DEFAULT '[]',
  workforce_total INTEGER DEFAULT 0,
  
  -- Work summary section
  work_completed JSONB NOT NULL DEFAULT '[]',
  work_planned_tomorrow JSONB NOT NULL DEFAULT '[]',
  
  -- Deliveries section
  deliveries JSONB NOT NULL DEFAULT '[]',
  
  -- Visitors section
  visitors JSONB NOT NULL DEFAULT '[]',
  
  -- Plant & Equipment section
  plant_equipment JSONB NOT NULL DEFAULT '[]',
  
  -- Health & Safety section
  safety_incidents JSONB NOT NULL DEFAULT '[]',
  safety_observations TEXT,
  toolbox_talk_delivered BOOLEAN DEFAULT false,
  toolbox_talk_topic TEXT,
  
  -- Instructions & Variations section
  instructions JSONB NOT NULL DEFAULT '[]',
  
  -- Delays & Issues section
  delays JSONB NOT NULL DEFAULT '[]',
  
  -- Photos section
  photos JSONB NOT NULL DEFAULT '[]',
  
  -- General notes
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one entry per project per date
  UNIQUE(project_id, entry_date)
);

-- Enable RLS
ALTER TABLE public.site_diary_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view diary entries in their org"
  ON public.site_diary_entries
  FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create diary entries"
  ON public.site_diary_entries
  FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin', 'site_manager')
    AND status = 'active'
  ));

CREATE POLICY "Site managers can update diary entries"
  ON public.site_diary_entries
  FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin', 'site_manager')
    AND status = 'active'
  ));

CREATE POLICY "Admins can delete diary entries"
  ON public.site_diary_entries
  FOR DELETE
  USING (organisation_id IN (
    SELECT organisation_id FROM organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'active'
  ));

-- Add updated_at trigger
CREATE TRIGGER update_site_diary_entries_updated_at
  BEFORE UPDATE ON public.site_diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_site_diary_entries_project_date ON public.site_diary_entries(project_id, entry_date DESC);
CREATE INDEX idx_site_diary_entries_org ON public.site_diary_entries(organisation_id);