
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS dropbox_folder_url TEXT;

COMMENT ON COLUMN projects.dropbox_folder_url IS 'Optional Dropbox shared folder URL for this project';
