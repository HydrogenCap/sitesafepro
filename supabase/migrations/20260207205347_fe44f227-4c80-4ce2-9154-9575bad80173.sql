-- Function to calculate contractor compliance score
CREATE OR REPLACE FUNCTION public.calculate_contractor_compliance()
RETURNS TRIGGER AS $$
DECLARE
    contractor_id UUID;
    total_docs INTEGER;
    valid_docs INTEGER;
    expired_docs INTEGER;
    expiring_docs INTEGER;
    new_score INTEGER;
    new_status TEXT;
BEGIN
    -- Get the contractor company ID from the affected row
    IF TG_OP = 'DELETE' THEN
        contractor_id := OLD.contractor_company_id;
    ELSE
        contractor_id := NEW.contractor_company_id;
    END IF;
    
    -- Skip if no contractor linked
    IF contractor_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Count documents by status
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE expiry_date IS NULL OR expiry_date > CURRENT_DATE + INTERVAL '30 days'),
        COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE),
        COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
    INTO total_docs, valid_docs, expired_docs, expiring_docs
    FROM contractor_compliance_docs
    WHERE contractor_company_id = contractor_id;
    
    -- Calculate score as percentage of valid docs
    IF total_docs > 0 THEN
        new_score := ROUND((valid_docs::DECIMAL / total_docs) * 100);
    ELSE
        new_score := 0;
    END IF;
    
    -- Determine status
    IF total_docs = 0 THEN
        new_status := 'incomplete';
    ELSIF expired_docs > 0 THEN
        new_status := 'expired';
    ELSIF expiring_docs > 0 THEN
        new_status := 'expiring_soon';
    ELSE
        new_status := 'compliant';
    END IF;
    
    -- Update the contractor company
    UPDATE contractor_companies 
    SET 
        compliance_score = new_score,
        compliance_status = new_status,
        updated_at = NOW()
    WHERE id = contractor_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trigger_compliance_insert ON contractor_compliance_docs;
CREATE TRIGGER trigger_compliance_insert
    AFTER INSERT ON contractor_compliance_docs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_contractor_compliance();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS trigger_compliance_update ON contractor_compliance_docs;
CREATE TRIGGER trigger_compliance_update
    AFTER UPDATE ON contractor_compliance_docs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_contractor_compliance();

-- Create trigger for DELETE
DROP TRIGGER IF EXISTS trigger_compliance_delete ON contractor_compliance_docs;
CREATE TRIGGER trigger_compliance_delete
    AFTER DELETE ON contractor_compliance_docs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_contractor_compliance();