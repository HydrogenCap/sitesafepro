-- Drop the overly permissive policy
DROP POLICY "Anyone can create visits via public check-in" ON public.site_visits;

-- Create a more secure policy that validates the access code
CREATE POLICY "Visitors can check in via valid access code"
ON public.site_visits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.site_access_codes sac
    WHERE sac.id = site_access_code_id
    AND sac.is_active = true
    AND sac.project_id = site_visits.project_id
    AND sac.organisation_id = site_visits.organisation_id
  )
);