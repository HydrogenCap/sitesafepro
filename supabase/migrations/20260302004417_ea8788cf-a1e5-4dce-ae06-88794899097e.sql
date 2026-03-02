-- Make document_version_id nullable for standalone site-mode evidence captures
ALTER TABLE public.evidence_items ALTER COLUMN document_version_id DROP NOT NULL;