import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ClientUser {
  id: string;
  organisation_id: string;
  email: string;
  full_name: string;
  company_name: string;
  role: 'client' | 'principal_designer' | 'cdm_advisor' | 'building_control';
  phone: string | null;
  project_ids: string[];
  can_view_documents: boolean;
  can_view_rams: boolean;
  can_view_actions: boolean;
  can_view_diary: boolean;
  can_view_workforce: boolean;
  can_view_incidents: boolean;
  can_download_reports: boolean;
  is_active: boolean;
  last_login_at: string | null;
}

interface Organisation {
  id: string;
  name: string;
  logo_url: string | null;
  primary_colour: string | null;
}

interface ClientPortalContextType {
  isClientUser: boolean;
  clientUser: ClientUser | null;
  organisation: Organisation | null;
  loading: boolean;
  logActivity: (action: string, resourceType?: string, resourceId?: string, resourceName?: string) => Promise<void>;
  updateLastLogin: () => Promise<void>;
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined);

export const useClientPortal = () => {
  const context = useContext(ClientPortalContext);
  if (!context) {
    throw new Error('useClientPortal must be used within a ClientPortalProvider');
  }
  return context;
};

export const ClientPortalProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isClientUser, setIsClientUser] = useState(false);
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkClientStatus = async () => {
      if (!user) {
        setIsClientUser(false);
        setClientUser(null);
        setOrganisation(null);
        setLoading(false);
        return;
      }

      try {
        // Check if user is a client portal user
        const { data: clientData, error: clientError } = await supabase
          .from('client_portal_users')
          .select('*')
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (clientError) {
          console.error('Error checking client status:', clientError);
          setLoading(false);
          return;
        }

        if (clientData) {
          // Also check if they have an organisation_members record (they might be both)
          const { data: memberData } = await supabase
            .from('organisation_members')
            .select('role')
            .eq('profile_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          // Only treat as client if they don't have an org member role
          if (!memberData) {
            setIsClientUser(true);
            setClientUser(clientData as ClientUser);

            // Fetch organisation details
            const { data: orgData } = await supabase
              .from('organisations')
              .select('id, name, logo_url, primary_colour')
              .eq('id', clientData.organisation_id)
              .single();

            if (orgData) {
              setOrganisation(orgData);
            }
          } else {
            setIsClientUser(false);
            setClientUser(null);
          }
        } else {
          setIsClientUser(false);
          setClientUser(null);
        }
      } catch (error) {
        console.error('Error in client check:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkClientStatus();
    }
  }, [user, authLoading]);

  const logActivity = useCallback(async (
    action: string,
    resourceType?: string,
    resourceId?: string,
    resourceName?: string
  ) => {
    if (!clientUser) return;

    try {
      await supabase.from('client_portal_activity').insert({
        client_user_id: clientUser.id,
        organisation_id: clientUser.organisation_id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        resource_name: resourceName,
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [clientUser]);

  const updateLastLogin = useCallback(async () => {
    if (!clientUser) return;

    try {
      await supabase
        .from('client_portal_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', clientUser.id);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }, [clientUser]);

  return (
    <ClientPortalContext.Provider value={{
      isClientUser,
      clientUser,
      organisation,
      loading: loading || authLoading,
      logActivity,
      updateLastLogin,
    }}>
      {children}
    </ClientPortalContext.Provider>
  );
};
