-- Fix PUBLIC_DATA_EXPOSURE: Require authentication for system templates
-- Update toolbox_talk_templates RLS policy
DROP POLICY IF EXISTS "Users can view system templates and their org templates" ON public.toolbox_talk_templates;

CREATE POLICY "Authenticated users can view templates"
ON public.toolbox_talk_templates FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    (is_system_template = true) OR 
    (organisation_id = get_user_org_id())
  )
);

-- Update rams_activity_library RLS policy
DROP POLICY IF EXISTS "Users can view system and org library items" ON public.rams_activity_library;

CREATE POLICY "Authenticated users can view library items"
ON public.rams_activity_library FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    (organisation_id IS NULL) OR 
    (organisation_id = get_user_org_id())
  )
);