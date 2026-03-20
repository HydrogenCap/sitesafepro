import { useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OrgContext } from '@/contexts/OrgContext';

type SubscriptionTier = 'starter' | 'professional' | 'enterprise';
type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';

interface Organisation {
  id: string;
  name: string;
  slug: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  max_projects: number;
  storage_used_bytes: number;
}

interface UseSubscriptionReturn {
  organisation: Organisation | null;
  tier: SubscriptionTier | 'trial';
  isActive: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number;
  projectLimit: number;
  storageLimit: number;
  canAccess: (feature: string) => boolean;
  loading: boolean;
}

const FEATURE_ACCESS: Record<string, SubscriptionTier[]> = {
  documents: ['starter', 'professional', 'enterprise'],
  e_signatures: ['starter', 'professional', 'enterprise'],
  qr_site_access: ['starter', 'professional', 'enterprise'],
  site_inductions: ['starter', 'professional', 'enterprise'],
  permits_to_work: ['professional', 'enterprise'],
  toolbox_talks: ['professional', 'enterprise'],
  inspections: ['professional', 'enterprise'],
  incident_reporting: ['professional', 'enterprise'],
  coshh_register: ['professional', 'enterprise'],
  compliance_calendar: ['professional', 'enterprise'],
  rams_workflow: ['professional', 'enterprise'],
  client_portal: ['enterprise'],
  ai_document_analysis: ['enterprise'],
  custom_branding: ['enterprise'],
};

const STORAGE_LIMITS: Record<SubscriptionTier, number> = {
  starter: 5 * 1024 * 1024 * 1024,
  professional: 25 * 1024 * 1024 * 1024,
  enterprise: 100 * 1024 * 1024 * 1024,
};

const PROJECT_LIMITS: Record<SubscriptionTier, number> = {
  starter: 1,
  professional: 5,
  enterprise: 999,
};

export const useSubscription = (): UseSubscriptionReturn => {
  const { user } = useAuth();
  // [P2 FIX] Use the active org from OrgContext instead of picking an arbitrary membership
  const orgCtx = useContext(OrgContext);
  const activeOrgId = orgCtx?.membership?.orgId ?? null;

  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrganisation = async () => {
      if (!user || !activeOrgId) {
        setOrganisation(null);
        setLoading(false);
        return;
      }

      try {
        // [P2 FIX] Fetch the specific active organisation instead of .maybeSingle()
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .select('*')
          .eq('id', activeOrgId)
          .single();

        if (orgError || !orgData) {
          setOrganisation(null);
          setLoading(false);
          return;
        }

        setOrganisation(orgData as Organisation);
      } catch (error) {
        console.error('Error fetching organisation:', error);
        setOrganisation(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisation();
  }, [user, activeOrgId]);

  const isTrialing = organisation?.subscription_status === 'trialing';
  const isActive = organisation?.subscription_status === 'active' || isTrialing;

  const tier: SubscriptionTier | 'trial' = isTrialing
    ? 'trial'
    : (organisation?.subscription_tier || 'starter');

  const trialDaysRemaining = organisation?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(organisation.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const effectiveTier: SubscriptionTier = isTrialing ? 'enterprise' : (organisation?.subscription_tier || 'starter');

  const canAccess = (feature: string): boolean => {
    if (!isActive) return false;
    const allowedTiers = FEATURE_ACCESS[feature];
    if (!allowedTiers) return true;
    return allowedTiers.includes(effectiveTier);
  };

  const projectLimit = isTrialing ? 999 : PROJECT_LIMITS[organisation?.subscription_tier || 'starter'];
  const storageLimit = isTrialing ? STORAGE_LIMITS.enterprise : STORAGE_LIMITS[organisation?.subscription_tier || 'starter'];

  return {
    organisation,
    tier,
    isActive,
    isTrialing,
    trialDaysRemaining,
    projectLimit,
    storageLimit,
    canAccess,
    loading,
  };
};
