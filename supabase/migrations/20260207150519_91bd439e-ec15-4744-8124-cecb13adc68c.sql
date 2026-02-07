-- Client portal user role enum
CREATE TYPE public.client_role AS ENUM ('client', 'principal_designer', 'cdm_advisor', 'building_control');

-- Client accounts linked to organisations
CREATE TABLE public.client_portal_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  -- Auth
  profile_id UUID REFERENCES public.profiles(id),
  email TEXT NOT NULL,
  
  -- Client details
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  role public.client_role NOT NULL DEFAULT 'client',
  phone TEXT,
  
  -- Access scope
  project_ids UUID[] NOT NULL DEFAULT '{}', -- Which projects they can see (empty = all)
  
  -- Permissions (all read-only, but granular)
  can_view_documents BOOLEAN DEFAULT true,
  can_view_rams BOOLEAN DEFAULT true,
  can_view_actions BOOLEAN DEFAULT true,
  can_view_diary BOOLEAN DEFAULT true,
  can_view_workforce BOOLEAN DEFAULT true,
  can_view_incidents BOOLEAN DEFAULT true,
  can_download_reports BOOLEAN DEFAULT true,
  
  -- Invitation
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  invite_token TEXT,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Notification preferences
  notify_weekly_report BOOLEAN DEFAULT true,
  notify_monthly_report BOOLEAN DEFAULT true,
  notify_overdue_actions BOOLEAN DEFAULT false,
  notify_incidents BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Client activity log (what they viewed)
CREATE TABLE public.client_portal_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL REFERENCES public.client_portal_users(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'viewed_dashboard', 'viewed_document', 'downloaded_report', etc.
  resource_type TEXT, -- 'project', 'document', 'rams', 'action', 'diary'
  resource_id UUID,
  resource_name TEXT,
  
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_activity ENABLE ROW LEVEL SECURITY;

-- Function to check if user is a client portal user
CREATE OR REPLACE FUNCTION public.is_client_portal_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_portal_users
    WHERE profile_id = _user_id
      AND is_active = true
  )
$$;

-- Function to get client user's organisation ID
CREATE OR REPLACE FUNCTION public.get_client_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id 
  FROM public.client_portal_users 
  WHERE profile_id = _user_id 
    AND is_active = true
  LIMIT 1
$$;

-- Client users can view their own record
CREATE POLICY "Client users can view their own record"
ON public.client_portal_users FOR SELECT
USING (profile_id = auth.uid());

-- Admins can manage client portal users in their org
CREATE POLICY "Admins can manage client portal users"
ON public.client_portal_users FOR ALL
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- Admins can view client activity in their org
CREATE POLICY "Admins can view client activity"
ON public.client_portal_activity FOR SELECT
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- Client users can view their own activity
CREATE POLICY "Client users can view own activity"
ON public.client_portal_activity FOR SELECT
USING (client_user_id IN (
  SELECT id FROM public.client_portal_users WHERE profile_id = auth.uid()
));

-- Client users can insert their own activity
CREATE POLICY "Client activity self-insert"
ON public.client_portal_activity FOR INSERT
WITH CHECK (client_user_id IN (
  SELECT id FROM public.client_portal_users WHERE profile_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX idx_client_users_org ON public.client_portal_users(organisation_id);
CREATE INDEX idx_client_users_email ON public.client_portal_users(email);
CREATE INDEX idx_client_users_profile ON public.client_portal_users(profile_id);
CREATE INDEX idx_client_users_invite_token ON public.client_portal_users(invite_token);
CREATE INDEX idx_client_activity_user ON public.client_portal_activity(client_user_id);
CREATE INDEX idx_client_activity_created ON public.client_portal_activity(created_at DESC);

-- Add RLS policy for client users to read projects they have access to
CREATE POLICY "Client users can view assigned projects"
ON public.projects FOR SELECT
USING (
  -- Check if user is a client portal user with access to this project
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.profile_id = auth.uid()
      AND cpu.is_active = true
      AND cpu.organisation_id = projects.organisation_id
      AND (
        array_length(cpu.project_ids, 1) IS NULL -- empty array = all projects
        OR projects.id = ANY(cpu.project_ids)
      )
  )
);

-- Add RLS policies for client users to read documents
CREATE POLICY "Client users can view documents"
ON public.documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.profile_id = auth.uid()
      AND cpu.is_active = true
      AND cpu.organisation_id = documents.organisation_id
      AND cpu.can_view_documents = true
      AND (
        array_length(cpu.project_ids, 1) IS NULL
        OR documents.project_id = ANY(cpu.project_ids)
      )
  )
);

-- Add RLS policies for client users to read corrective actions
CREATE POLICY "Client users can view actions"
ON public.corrective_actions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.profile_id = auth.uid()
      AND cpu.is_active = true
      AND cpu.organisation_id = corrective_actions.organisation_id
      AND cpu.can_view_actions = true
      AND (
        array_length(cpu.project_ids, 1) IS NULL
        OR corrective_actions.project_id = ANY(cpu.project_ids)
      )
  )
);

-- Add RLS policies for client users to read RAMS
CREATE POLICY "Client users can view RAMS"
ON public.rams_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.profile_id = auth.uid()
      AND cpu.is_active = true
      AND cpu.organisation_id = rams_records.organisation_id
      AND cpu.can_view_rams = true
      AND (
        array_length(cpu.project_ids, 1) IS NULL
        OR rams_records.project_id = ANY(cpu.project_ids)
      )
  )
);

-- Add RLS policies for client users to read site diary
CREATE POLICY "Client users can view site diary"
ON public.site_diary_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.profile_id = auth.uid()
      AND cpu.is_active = true
      AND cpu.organisation_id = site_diary_entries.organisation_id
      AND cpu.can_view_diary = true
      AND (
        array_length(cpu.project_ids, 1) IS NULL
        OR site_diary_entries.project_id = ANY(cpu.project_ids)
      )
  )
);

-- Add RLS policies for client users to read incidents
CREATE POLICY "Client users can view incidents"
ON public.incidents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_users cpu
    WHERE cpu.profile_id = auth.uid()
      AND cpu.is_active = true
      AND cpu.organisation_id = incidents.organisation_id
      AND cpu.can_view_incidents = true
      AND (
        array_length(cpu.project_ids, 1) IS NULL
        OR incidents.project_id = ANY(cpu.project_ids)
      )
  )
);