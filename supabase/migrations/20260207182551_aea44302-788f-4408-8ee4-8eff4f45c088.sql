-- Update foreign key constraints to CASCADE on delete for all project-related tables

-- documents
ALTER TABLE public.documents DROP CONSTRAINT documents_project_id_fkey;
ALTER TABLE public.documents ADD CONSTRAINT documents_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- activity_logs
ALTER TABLE public.activity_logs DROP CONSTRAINT activity_logs_project_id_fkey;
ALTER TABLE public.activity_logs ADD CONSTRAINT activity_logs_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- toolbox_talks
ALTER TABLE public.toolbox_talks DROP CONSTRAINT toolbox_talks_project_id_fkey;
ALTER TABLE public.toolbox_talks ADD CONSTRAINT toolbox_talks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- permits_to_work
ALTER TABLE public.permits_to_work DROP CONSTRAINT permits_to_work_project_id_fkey;
ALTER TABLE public.permits_to_work ADD CONSTRAINT permits_to_work_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- inspections
ALTER TABLE public.inspections DROP CONSTRAINT inspections_project_id_fkey;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- incidents
ALTER TABLE public.incidents DROP CONSTRAINT incidents_project_id_fkey;
ALTER TABLE public.incidents ADD CONSTRAINT incidents_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- site_diary_entries
ALTER TABLE public.site_diary_entries DROP CONSTRAINT site_diary_entries_project_id_fkey;
ALTER TABLE public.site_diary_entries ADD CONSTRAINT site_diary_entries_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;