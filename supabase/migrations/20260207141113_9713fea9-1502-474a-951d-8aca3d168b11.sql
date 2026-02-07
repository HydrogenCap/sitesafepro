-- Recreate the view with SECURITY INVOKER (default, but explicit)
-- Drop and recreate to ensure it uses invoker security
DROP VIEW IF EXISTS public.actions_with_status;

CREATE VIEW public.actions_with_status 
WITH (security_invoker = true)
AS
SELECT 
  ca.*,
  CASE 
    WHEN ca.status = 'closed' THEN 'closed'
    WHEN ca.due_date < CURRENT_DATE AND ca.status NOT IN ('closed', 'awaiting_verification') THEN 'overdue'
    ELSE ca.status::text
  END AS computed_status,
  CASE 
    WHEN ca.due_date < CURRENT_DATE AND ca.status NOT IN ('closed', 'awaiting_verification') 
    THEN CURRENT_DATE - ca.due_date
    ELSE 0
  END AS days_overdue,
  p.name AS project_name,
  raised.full_name AS raised_by_name,
  assigned.full_name AS assigned_to_name,
  verifier.full_name AS verified_by_name
FROM public.corrective_actions ca
LEFT JOIN public.projects p ON ca.project_id = p.id
LEFT JOIN public.profiles raised ON ca.raised_by = raised.id
LEFT JOIN public.profiles assigned ON ca.assigned_to = assigned.id
LEFT JOIN public.profiles verifier ON ca.verified_by = verifier.id;

-- Grant access to the view
GRANT SELECT ON public.actions_with_status TO authenticated;