-- 1. Add 'setup' to the project_status enum
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'setup' BEFORE 'active';

-- 2. Add go-live tracking columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS went_live_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS went_live_by UUID REFERENCES public.profiles(id);

-- 3. Create document templates table for auto-generating site docs
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  
  -- The template file stored in storage
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Template configuration
  auto_generate_on_go_live BOOLEAN NOT NULL DEFAULT true,
  requires_acknowledgement BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_templates
CREATE POLICY "Users can view templates in their org"
ON public.document_templates FOR SELECT
USING (organisation_id = get_user_org_id());

CREATE POLICY "Admins can insert templates"
ON public.document_templates FOR INSERT
WITH CHECK (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

CREATE POLICY "Admins can update templates"
ON public.document_templates FOR UPDATE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

CREATE POLICY "Admins can delete templates"
ON public.document_templates FOR DELETE
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

-- 4. Add template tracking columns to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS generated_from_template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;

-- 5. Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-templates', 
  'document-templates', 
  false,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for document-templates bucket
CREATE POLICY "Users can view templates in their org storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'document-templates' 
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() AND status = 'active'
    )
  )
);

CREATE POLICY "Admins can upload templates storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-templates'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  )
);

CREATE POLICY "Admins can delete templates storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'document-templates'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organisations WHERE id IN (
      SELECT organisation_id FROM public.organisation_members 
      WHERE profile_id = auth.uid() 
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  )
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_org ON public.document_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_documents_template ON public.documents(generated_from_template_id);
CREATE INDEX IF NOT EXISTS idx_projects_went_live ON public.projects(went_live_at);

-- 7. Add trigger for updated_at on document_templates
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();