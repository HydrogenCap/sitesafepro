-- Add export_type and metadata columns to document_exports
ALTER TABLE document_exports ADD COLUMN IF NOT EXISTS export_type TEXT DEFAULT 'version_pdf';
ALTER TABLE document_exports ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add project_id to document_exports for handover pack exports (not version-specific)
ALTER TABLE document_exports ALTER COLUMN document_version_id DROP NOT NULL;
ALTER TABLE document_exports ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

CREATE INDEX IF NOT EXISTS idx_document_exports_export_type ON document_exports(export_type);
CREATE INDEX IF NOT EXISTS idx_document_exports_project_id ON document_exports(project_id) WHERE project_id IS NOT NULL;