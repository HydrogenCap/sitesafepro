
ALTER TABLE public.permits_to_work
ADD COLUMN contractor_company_id uuid REFERENCES public.contractor_companies(id) ON DELETE SET NULL;
