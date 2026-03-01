-- Allow organisation members to view profiles of other members in the same organisation
CREATE POLICY "Org members can view fellow members profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.organisation_members om1
    JOIN public.organisation_members om2 ON om1.organisation_id = om2.organisation_id
    WHERE om1.profile_id = auth.uid()
      AND om2.profile_id = profiles.id
      AND om1.status = 'active'
  )
);

-- Drop the old restrictive policy
DROP POLICY "Users can view their own profile" ON public.profiles;