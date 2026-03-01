-- Add required_doc_types column to contractor_companies
ALTER TABLE public.contractor_companies
ADD COLUMN required_doc_types text[] NOT NULL DEFAULT '{}'::text[];