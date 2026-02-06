-- Remove the foreign key constraint from profiles to auth.users
-- This allows profiles to be created independently
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;