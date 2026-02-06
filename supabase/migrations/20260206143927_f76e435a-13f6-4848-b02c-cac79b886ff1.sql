-- Fix function search path security warnings
ALTER FUNCTION public.get_user_org_id() SET search_path = public;
ALTER FUNCTION public.set_org_id() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.generate_unique_slug(TEXT) SET search_path = public;