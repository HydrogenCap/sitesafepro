-- C5: Add health data consent field to contractor_operatives
-- Special category health data (medical conditions, blood type) requires explicit consent under UK GDPR Article 9

ALTER TABLE public.contractor_operatives
ADD COLUMN health_data_consent boolean NOT NULL DEFAULT false;

ALTER TABLE public.contractor_operatives
ADD COLUMN health_data_consent_at timestamp with time zone;

-- Add a validation trigger: if medical conditions or blood type are provided, consent must be true
CREATE OR REPLACE FUNCTION public.validate_health_data_consent()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.known_medical_conditions IS NOT NULL OR NEW.blood_type IS NOT NULL) 
     AND NEW.health_data_consent = false THEN
    RAISE EXCEPTION 'Health data consent is required before storing medical conditions or blood type (UK GDPR Article 9)';
  END IF;
  
  -- Auto-set consent timestamp
  IF NEW.health_data_consent = true AND OLD.health_data_consent = false THEN
    NEW.health_data_consent_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_health_data_consent_trigger
BEFORE INSERT OR UPDATE ON public.contractor_operatives
FOR EACH ROW
EXECUTE FUNCTION public.validate_health_data_consent();