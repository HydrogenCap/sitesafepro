-- Add new document categories to the enum
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'risk_assessment';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'fire_safety';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'meeting_minutes';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'drawing';

-- Add AI classification columns to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_category document_category;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low'));
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ai_compliance_flags JSONB;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS acknowledgement_deadline TIMESTAMP WITH TIME ZONE;

-- Create document_acknowledgements table for e-signature tracking
CREATE TABLE IF NOT EXISTS public.document_acknowledgements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  company_name TEXT,
  signature_data TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(document_id, profile_id)
);

ALTER TABLE public.document_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view acknowledgements in their organisation"
ON public.document_acknowledgements FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can create acknowledgements"
ON public.document_acknowledgements FOR INSERT
WITH CHECK (
  organisation_id = get_user_org_id()
  AND profile_id = auth.uid()
);

CREATE INDEX idx_doc_ack_document ON public.document_acknowledgements(document_id);
CREATE INDEX idx_doc_ack_profile ON public.document_acknowledgements(profile_id);