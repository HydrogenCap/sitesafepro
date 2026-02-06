-- Create enum for talk categories
CREATE TYPE public.toolbox_talk_category AS ENUM (
  'working_at_height',
  'manual_handling',
  'fire_safety',
  'electrical_safety',
  'excavations',
  'confined_spaces',
  'ppe',
  'housekeeping',
  'hand_tools',
  'power_tools',
  'scaffolding',
  'lifting_operations',
  'hazardous_substances',
  'noise',
  'dust',
  'asbestos',
  'slips_trips_falls',
  'vehicle_safety',
  'environmental',
  'emergency_procedures',
  'mental_health',
  'general_safety',
  'other'
);

-- Templates table (system templates have organisation_id = NULL)
CREATE TABLE public.toolbox_talk_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category public.toolbox_talk_category NOT NULL DEFAULT 'general_safety',
  description TEXT,
  content TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 15,
  is_system_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Delivered talks table
CREATE TABLE public.toolbox_talks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.toolbox_talk_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category public.toolbox_talk_category NOT NULL DEFAULT 'general_safety',
  content TEXT NOT NULL,
  delivered_by UUID NOT NULL REFERENCES public.profiles(id),
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT,
  weather_conditions TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attendees table with signatures
CREATE TABLE public.toolbox_talk_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  toolbox_talk_id UUID NOT NULL REFERENCES public.toolbox_talks(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  attendee_name TEXT NOT NULL,
  attendee_company TEXT,
  attendee_trade TEXT,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.toolbox_talk_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolbox_talk_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view system templates and their org templates"
  ON public.toolbox_talk_templates FOR SELECT
  USING (
    is_system_template = TRUE 
    OR organisation_id = get_user_org_id()
  );

CREATE POLICY "Users can create org templates"
  ON public.toolbox_talk_templates FOR INSERT
  WITH CHECK (
    organisation_id = get_user_org_id() 
    AND is_system_template = FALSE
  );

CREATE POLICY "Admins can update their org templates"
  ON public.toolbox_talk_templates FOR UPDATE
  USING (
    organisation_id = get_user_org_id()
    AND organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Admins can delete their org templates"
  ON public.toolbox_talk_templates FOR DELETE
  USING (
    organisation_id = get_user_org_id()
    AND is_system_template = FALSE
    AND organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- RLS Policies for delivered talks
CREATE POLICY "Users can view talks in their organisation"
  ON public.toolbox_talks FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Site managers can create talks"
  ON public.toolbox_talks FOR INSERT
  WITH CHECK (
    organisation_id = get_user_org_id()
    AND organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
        AND role IN ('owner', 'admin', 'site_manager')
        AND status = 'active'
    )
  );

CREATE POLICY "Deliverer can update their talks"
  ON public.toolbox_talks FOR UPDATE
  USING (
    organisation_id = get_user_org_id()
    AND (delivered_by = auth.uid() OR organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ))
  );

-- RLS Policies for attendees
CREATE POLICY "Users can view attendees in their organisation"
  ON public.toolbox_talk_attendees FOR SELECT
  USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can add attendees to org talks"
  ON public.toolbox_talk_attendees FOR INSERT
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Users can update attendee signatures"
  ON public.toolbox_talk_attendees FOR UPDATE
  USING (organisation_id = get_user_org_id());

-- Add updated_at trigger for templates
CREATE TRIGGER update_toolbox_talk_templates_updated_at
  BEFORE UPDATE ON public.toolbox_talk_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_toolbox_talks_org_id ON public.toolbox_talks(organisation_id);
CREATE INDEX idx_toolbox_talks_project_id ON public.toolbox_talks(project_id);
CREATE INDEX idx_toolbox_talks_delivered_at ON public.toolbox_talks(delivered_at DESC);
CREATE INDEX idx_toolbox_talk_attendees_talk_id ON public.toolbox_talk_attendees(toolbox_talk_id);
CREATE INDEX idx_toolbox_talk_templates_org_id ON public.toolbox_talk_templates(organisation_id);
CREATE INDEX idx_toolbox_talk_templates_category ON public.toolbox_talk_templates(category);