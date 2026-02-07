-- Add upload token and expiry to contractor companies for self-service portal
ALTER TABLE public.contractor_companies
ADD COLUMN IF NOT EXISTS upload_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS upload_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Create contractor_document_requests table to track document requests sent
CREATE TABLE IF NOT EXISTS public.contractor_document_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  contractor_company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  doc_types TEXT[] NOT NULL DEFAULT '{}',
  message TEXT,
  sent_by UUID NOT NULL REFERENCES public.profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  opened_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.contractor_document_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for document requests
CREATE POLICY "Users can view document requests in their org"
ON public.contractor_document_requests
FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can create document requests"
ON public.contractor_document_requests
FOR INSERT
WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "Admins can update document requests"
ON public.contractor_document_requests
FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM organisation_members 
  WHERE profile_id = auth.uid() 
  AND role IN ('owner', 'admin', 'site_manager')
  AND status = 'active'
));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contractor_doc_requests_contractor 
ON public.contractor_document_requests(contractor_company_id);

CREATE INDEX IF NOT EXISTS idx_contractor_companies_upload_token
ON public.contractor_companies(upload_token) WHERE upload_token IS NOT NULL;