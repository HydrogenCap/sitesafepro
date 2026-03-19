-- Create activity type enum
CREATE TYPE public.activity_type AS ENUM (
  'project_created',
  'project_updated',
  'project_archived',
  'document_uploaded',
  'document_approved',
  'document_rejected',
  'document_deleted',
  'member_invited',
  'member_joined',
  'member_role_changed',
  'member_deactivated',
  'site_access_created',
  'site_visit_checkin',
  'site_visit_checkout',
  'settings_updated',
  'subscription_changed'
);

-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type public.activity_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_organisation ON public.activity_logs(organisation_id);
CREATE INDEX idx_activity_logs_project ON public.activity_logs(project_id);
CREATE INDEX idx_activity_logs_actor ON public.activity_logs(actor_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type ON public.activity_logs(activity_type);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view activity in their organisation
CREATE POLICY "Users can view activity in their organisation"
ON public.activity_logs
FOR SELECT
USING (organisation_id = get_user_org_id());

-- Users can create activity logs in their organisation
CREATE POLICY "Users can create activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (organisation_id = get_user_org_id());

-- Service role can insert logs (for edge functions)
CREATE POLICY "Service role can insert logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (true);

-- Enable realtime for activity logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;