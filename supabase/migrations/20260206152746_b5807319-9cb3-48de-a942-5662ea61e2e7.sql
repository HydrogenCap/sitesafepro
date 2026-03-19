-- Create a security definer function to check if user is admin/owner in an org
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE profile_id = _user_id
      AND organisation_id = _org_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
  )
$$;

-- Create a function to check if user is member of an org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE profile_id = _user_id
      AND organisation_id = _org_id
      AND status = 'active'
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of their organisation" ON public.organisation_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.organisation_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.organisation_members;

-- Recreate policies using security definer functions
CREATE POLICY "Users can view members of their organisation"
ON public.organisation_members
FOR SELECT
USING (public.is_org_member(auth.uid(), organisation_id));

CREATE POLICY "Admins can manage members"
ON public.organisation_members
FOR INSERT
WITH CHECK (
  public.is_org_admin(auth.uid(), organisation_id) 
  OR (profile_id = auth.uid() AND auth.uid() IS NOT NULL)
);

CREATE POLICY "Admins can update members"
ON public.organisation_members
FOR UPDATE
USING (
  public.is_org_admin(auth.uid(), organisation_id)
  OR profile_id = auth.uid()
);