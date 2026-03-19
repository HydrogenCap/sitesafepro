-- Corrective action priority levels
CREATE TYPE public.action_priority AS ENUM ('critical', 'high', 'medium', 'low');

-- Corrective action status
CREATE TYPE public.action_status AS ENUM ('open', 'in_progress', 'awaiting_verification', 'closed', 'overdue');

-- Source of the action
CREATE TYPE public.action_source AS ENUM (
  'inspection',
  'incident', 
  'audit',
  'toolbox_talk',
  'observation',
  'near_miss',
  'client_request',
  'other'
);

-- Main corrective actions table
CREATE TABLE public.corrective_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- What was found
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_on_site TEXT,
  
  -- Classification
  source action_source NOT NULL DEFAULT 'observation',
  priority action_priority NOT NULL DEFAULT 'medium',
  status action_status NOT NULL DEFAULT 'open',
  
  -- Reference to source record (nullable — links to inspection/incident when those modules exist)
  source_reference_id UUID,
  source_reference_type TEXT,
  
  -- Assignment
  raised_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_to_company TEXT,
  
  -- Dates
  raised_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Resolution
  resolution_notes TEXT,
  
  -- Recurrence tracking
  is_recurring BOOLEAN DEFAULT false,
  recurrence_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Photo evidence table (before and after photos)
CREATE TABLE public.action_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- before = photo of the problem, after = photo of the fix
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('before', 'after', 'during')),
  caption TEXT,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Action comments / activity log
CREATE TABLE public.action_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  
  -- Track status changes in the comment stream
  is_status_change BOOLEAN DEFAULT false,
  old_status action_status,
  new_status action_status,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for corrective_actions
CREATE POLICY "Users can view actions in their org"
ON public.corrective_actions FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can create actions in their org"
ON public.corrective_actions FOR INSERT
WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Users can update actions in their org"
ON public.corrective_actions FOR UPDATE
USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can delete actions"
ON public.corrective_actions FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- RLS policies for action_evidence
CREATE POLICY "Users can view evidence in their org"
ON public.action_evidence FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can add evidence"
ON public.action_evidence FOR INSERT
WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Users can delete their own evidence"
ON public.action_evidence FOR DELETE
USING (uploaded_by = auth.uid());

-- RLS policies for action_comments
CREATE POLICY "Users can view comments in their org"
ON public.action_comments FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can add comments"
ON public.action_comments FOR INSERT
WITH CHECK (organisation_id = get_user_org_id());

-- Storage bucket for action evidence photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'action-evidence', 
  'action-evidence', 
  false,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can view action evidence in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'action-evidence' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  )
);

CREATE POLICY "Users can upload action evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'action-evidence'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  )
);

CREATE POLICY "Users can delete action evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'action-evidence'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_actions_org ON public.corrective_actions(organisation_id);
CREATE INDEX idx_actions_project ON public.corrective_actions(project_id);
CREATE INDEX idx_actions_status ON public.corrective_actions(status);
CREATE INDEX idx_actions_assigned ON public.corrective_actions(assigned_to);
CREATE INDEX idx_actions_due ON public.corrective_actions(due_date);
CREATE INDEX idx_actions_priority ON public.corrective_actions(priority);
CREATE INDEX idx_evidence_action ON public.action_evidence(action_id);
CREATE INDEX idx_comments_action ON public.action_comments(action_id);

-- Trigger for updated_at
CREATE TRIGGER update_corrective_actions_updated_at
BEFORE UPDATE ON public.corrective_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();