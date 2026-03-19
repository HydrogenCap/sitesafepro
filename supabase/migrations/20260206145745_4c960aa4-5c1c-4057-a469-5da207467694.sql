-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp']
);

-- Create document categories enum
CREATE TYPE public.document_category AS ENUM (
  'rams',
  'method_statement',
  'safety_plan',
  'coshh',
  'induction',
  'permit',
  'inspection',
  'certificate',
  'insurance',
  'other'
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  
  name TEXT NOT NULL,
  description TEXT,
  category document_category NOT NULL DEFAULT 'other',
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- For document approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES public.documents(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Storage policies for documents bucket
CREATE POLICY "Users can view documents in their organisation"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  )
);

CREATE POLICY "Users can upload documents to their organisation"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  )
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  )
);

-- Documents table RLS policies
CREATE POLICY "Users can view documents in their organisation"
ON public.documents FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Users can create documents in their organisation"
ON public.documents FOR INSERT
WITH CHECK (
  organisation_id = get_user_org_id()
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Admins can update documents"
ON public.documents FOR UPDATE
USING (
  organisation_id IN (
    SELECT organisation_id FROM public.organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin', 'site_manager')
    AND status = 'active'
  )
);

CREATE POLICY "Admins can delete documents"
ON public.documents FOR DELETE
USING (
  organisation_id IN (
    SELECT organisation_id FROM public.organisation_members
    WHERE profile_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'active'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_documents_organisation ON public.documents(organisation_id);
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_category ON public.documents(category);