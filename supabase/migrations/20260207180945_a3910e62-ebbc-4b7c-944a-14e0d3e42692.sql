-- Add WhatsApp fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at TIMESTAMP WITH TIME ZONE;

-- Add WhatsApp fields to organisations table
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS whatsapp_daily_limit INTEGER DEFAULT 50;

-- Create notification preferences table for per-user settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  
  -- Notification types with channel preferences
  document_ack_email BOOLEAN DEFAULT true,
  document_ack_push BOOLEAN DEFAULT true,
  document_ack_whatsapp BOOLEAN DEFAULT true,
  
  action_assigned_email BOOLEAN DEFAULT true,
  action_assigned_push BOOLEAN DEFAULT true,
  action_assigned_whatsapp BOOLEAN DEFAULT true,
  
  action_overdue_email BOOLEAN DEFAULT true,
  action_overdue_push BOOLEAN DEFAULT true,
  action_overdue_whatsapp BOOLEAN DEFAULT true,
  
  rams_issued_email BOOLEAN DEFAULT true,
  rams_issued_whatsapp BOOLEAN DEFAULT true,
  
  permit_expiring_email BOOLEAN DEFAULT true,
  permit_expiring_push BOOLEAN DEFAULT true,
  permit_expiring_whatsapp BOOLEAN DEFAULT true,
  
  induction_reminder_email BOOLEAN DEFAULT true,
  induction_reminder_whatsapp BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(profile_id, organisation_id)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences FOR UPDATE
USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (profile_id = auth.uid() AND organisation_id = get_user_org_id());

-- WhatsApp message log table
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  recipient_profile_id UUID REFERENCES public.profiles(id),
  
  recipient_number TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_params JSONB DEFAULT '{}',
  
  -- Meta API response
  message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'rate_limited')),
  error_message TEXT,
  
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- What triggered this message
  trigger_type TEXT,
  trigger_reference_id UUID,
  
  -- Reply tracking (if user replies to notification)
  reply_text TEXT,
  reply_received_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view WhatsApp messages"
ON public.whatsapp_messages FOR SELECT
USING (organisation_id IN (
  SELECT organisation_id FROM public.organisation_members
  WHERE profile_id = auth.uid()
  AND role IN ('owner', 'admin')
  AND status = 'active'
));

CREATE INDEX idx_wa_messages_org ON public.whatsapp_messages(organisation_id);
CREATE INDEX idx_wa_messages_recipient ON public.whatsapp_messages(recipient_profile_id);
CREATE INDEX idx_wa_messages_sent_at ON public.whatsapp_messages(sent_at);
CREATE INDEX idx_wa_messages_status ON public.whatsapp_messages(status);

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_whatsapp_rate_limit(
  p_org_id UUID,
  p_recipient_number TEXT,
  p_daily_org_limit INTEGER DEFAULT 50
) RETURNS BOOLEAN AS $$
DECLARE
  org_today_count INTEGER;
  recipient_hour_count INTEGER;
  recipient_day_count INTEGER;
BEGIN
  -- Check org daily limit
  SELECT COUNT(*) INTO org_today_count
  FROM public.whatsapp_messages
  WHERE organisation_id = p_org_id
  AND sent_at > CURRENT_DATE
  AND status != 'rate_limited';
  
  IF org_today_count >= p_daily_org_limit THEN RETURN FALSE; END IF;
  
  -- Check recipient hourly limit (max 3 per hour)
  SELECT COUNT(*) INTO recipient_hour_count
  FROM public.whatsapp_messages
  WHERE recipient_number = p_recipient_number
  AND sent_at > now() - INTERVAL '1 hour'
  AND status != 'rate_limited';
  
  IF recipient_hour_count >= 3 THEN RETURN FALSE; END IF;
  
  -- Check recipient daily limit (max 10 per day)
  SELECT COUNT(*) INTO recipient_day_count
  FROM public.whatsapp_messages
  WHERE recipient_number = p_recipient_number
  AND sent_at > CURRENT_DATE
  AND status != 'rate_limited';
  
  IF recipient_day_count >= 10 THEN RETURN FALSE; END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Check for duplicate messages (same template + reference within 24 hours)
CREATE OR REPLACE FUNCTION public.check_whatsapp_duplicate(
  p_recipient_number TEXT,
  p_template_name TEXT,
  p_trigger_reference_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.whatsapp_messages
    WHERE recipient_number = p_recipient_number
    AND template_name = p_template_name
    AND trigger_reference_id = p_trigger_reference_id
    AND sent_at > now() - INTERVAL '24 hours'
    AND status != 'failed'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();