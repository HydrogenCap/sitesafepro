import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionInfo {
  subscribed: boolean;
  tier: 'starter' | 'professional' | 'enterprise' | null;
  subscriptionEnd: string | null;
  stripeCustomerId: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionInfo;
  subscriptionLoading: boolean;
  signUp: (email: string, password: string, fullName: string, companyName: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    subscribed: false,
    tier: null,
    subscriptionEnd: null,
    stripeCustomerId: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setSubscription({
        subscribed: false,
        tier: null,
        subscriptionEnd: null,
        stripeCustomerId: null,
      });
      return;
    }

    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        return;
      }

      setSubscription({
        subscribed: data?.subscribed || false,
        tier: data?.tier || null,
        subscriptionEnd: data?.subscription_end || null,
        stripeCustomerId: data?.stripe_customer_id || null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [session]);

  const openCustomerPortal = useCallback(async () => {
    if (!session) {
      console.error('No session for customer portal');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Customer portal error:', error);
    }
  }, [session]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Check subscription when session changes
  useEffect(() => {
    if (session) {
      checkSubscription();
    }
  }, [session, checkSubscription]);

  // Periodic subscription check every 60 seconds when logged in
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [session, checkSubscription]);

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    companyName: string,
    phone?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            company_name: companyName,
            phone: phone || null,
          },
        },
      });

      if (error) throw error;

      // If signup successful and we have a user, create org and membership
      if (data.user) {
        // Generate slug from company name
        const { data: slugData } = await supabase.rpc('generate_unique_slug', {
          base_name: companyName
        });

        // Create organisation with trial status
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({
            name: companyName,
            slug: slugData || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            owner_id: data.user.id,
            phone: phone || null,
            subscription_status: 'trialing',
            subscription_tier: 'enterprise', // Full access during trial
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Create organisation membership as owner
        const { error: memberError } = await supabase
          .from('organisation_members')
          .insert({
            organisation_id: orgData.id,
            profile_id: data.user.id,
            role: 'owner',
            status: 'active',
            accepted_at: new Date().toISOString(),
          });

        if (memberError) throw memberError;

        // Update profile with phone if provided
        if (phone) {
          await supabase
            .from('profiles')
            .update({ phone })
            .eq('id', data.user.id);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setSubscription({
      subscribed: false,
      tier: null,
      subscriptionEnd: null,
      stripeCustomerId: null,
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      subscription,
      subscriptionLoading,
      signUp, 
      signIn, 
      signOut,
      checkSubscription,
      openCustomerPortal,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
