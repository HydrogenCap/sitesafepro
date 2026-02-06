-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'site_manager', 'contractor', 'client_viewer');
CREATE TYPE member_status AS ENUM ('invited', 'active', 'deactivated');
CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organisations table
CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES public.profiles(id),
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  primary_colour TEXT DEFAULT '#0F766E',
  subscription_tier subscription_tier DEFAULT 'starter',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status subscription_status DEFAULT 'trialing',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '14 days'),
  storage_used_bytes BIGINT DEFAULT 0,
  max_projects INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organisation_members table
CREATE TABLE public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'contractor',
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status member_status NOT NULL DEFAULT 'invited',
  invite_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organisation_id, profile_id)
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  client_name TEXT,
  principal_designer TEXT,
  start_date DATE,
  estimated_end_date DATE,
  status project_status DEFAULT 'active',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Function to get current user's organisation ID
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid AS $$
  SELECT organisation_id 
  FROM public.organisation_members 
  WHERE profile_id = auth.uid() 
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to auto-set organisation_id on insert
CREATE OR REPLACE FUNCTION public.set_org_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.organisation_id IS NULL THEN
    NEW.organisation_id := public.get_user_org_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for projects to auto-set org_id
CREATE TRIGGER set_project_org_id
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_org_id();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for organisations
CREATE POLICY "Users can view organisations they belong to"
  ON public.organisations FOR SELECT
  USING (
    id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners can update their organisation"
  ON public.organisations FOR UPDATE
  USING (
    id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Authenticated users can create organisations"
  ON public.organisations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for organisation_members
CREATE POLICY "Users can view members of their organisation"
  ON public.organisation_members FOR SELECT
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage members"
  ON public.organisation_members FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
    OR auth.uid() IS NOT NULL -- Allow new users to be added during signup
  );

CREATE POLICY "Admins can update members"
  ON public.organisation_members FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
    )
    OR profile_id = auth.uid() -- Users can update their own membership (e.g., accept invite)
  );

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their organisation"
  ON public.projects FOR SELECT
  USING (organisation_id = public.get_user_org_id());

CREATE POLICY "Site managers and above can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
        AND role IN ('owner', 'admin', 'site_manager') 
        AND status = 'active'
    )
  );

CREATE POLICY "Site managers and above can update projects"
  ON public.projects FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
        AND role IN ('owner', 'admin', 'site_manager') 
        AND status = 'active'
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION public.generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.organisations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;