-- Add expiry_date column to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date DATE;
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- Add tracking columns for reminder notifications
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_reminder_sent_30 BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_reminder_sent_14 BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_reminder_sent_7 BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_reminder_sent_1 BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_reminder_sent_0 BOOLEAN DEFAULT FALSE;