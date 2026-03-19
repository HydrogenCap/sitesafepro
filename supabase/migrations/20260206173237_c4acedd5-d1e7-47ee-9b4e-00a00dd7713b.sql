-- Add rejection_reason column for RAMS review workflow
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add rejected_by and rejected_at columns
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;