-- Add emergency location columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS nearest_ae_name TEXT,
ADD COLUMN IF NOT EXISTS nearest_ae_address TEXT,
ADD COLUMN IF NOT EXISTS nearest_ae_distance TEXT,
ADD COLUMN IF NOT EXISTS nearest_fire_station_name TEXT,
ADD COLUMN IF NOT EXISTS nearest_fire_station_address TEXT,
ADD COLUMN IF NOT EXISTS nearest_police_station_name TEXT,
ADD COLUMN IF NOT EXISTS nearest_police_station_address TEXT,
ADD COLUMN IF NOT EXISTS site_emergency_number TEXT,
ADD COLUMN IF NOT EXISTS first_aider_name TEXT,
ADD COLUMN IF NOT EXISTS fire_warden_name TEXT;