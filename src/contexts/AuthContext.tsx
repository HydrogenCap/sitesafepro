import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, companyName: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
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

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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

    return () => subscription.unsubscribe();
  }, []);

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

        // Create organisation
        const { data: orgData, error: orgError } = await supabase
          .from('organisations')
          .insert({
            name: companyName,
            slug: slugData || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            owner_id: data.user.id,
            phone: phone || null,
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
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
