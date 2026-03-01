
-- Add missing reminder tracking columns to contractor_compliance_docs
ALTER TABLE public.contractor_compliance_docs 
  ADD COLUMN IF NOT EXISTS reminder_sent_14_days boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_1_day boolean DEFAULT false;
