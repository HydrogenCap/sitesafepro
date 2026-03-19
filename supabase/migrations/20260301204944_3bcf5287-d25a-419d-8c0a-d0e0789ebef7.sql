-- Add QR attendance token to toolbox talks
ALTER TABLE toolbox_talks
  ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_toolbox_talks_qr_token
  ON toolbox_talks(qr_token)
  WHERE qr_token IS NOT NULL;

COMMENT ON COLUMN toolbox_talks.qr_token IS 'Unique token for QR code self-registration link';