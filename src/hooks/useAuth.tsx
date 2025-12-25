import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email_verified: boolean;
  country: string | null;
  user_type: 'particulier' | 'proprietaire' | 'demarcheur' | 'agence' | null;
  agency_name: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  refreshVerificationStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isEmailVerified: false,
  signOut: async () => {},
  resendVerificationEmail: async () => ({ success: false }),
  refreshVerificationStatus: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const isEmailVerified = profile?.email_verified || false;

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, phone, email_verified, country, user_type, agency_name')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const refreshVerificationStatus = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fetch profile when user changes
        if (session?.user?.id) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user?.id) {
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resendVerificationEmail = async () => {
    if (!user?.email || !user?.id) return { success: false, error: 'No user found' };
    
    try {
      const firstName = user.user_metadata?.first_name || 'Utilisateur';
      
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: user.email,
          firstName,
          userId: user.id,
        },
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      loading, 
      isEmailVerified, 
      signOut, 
      resendVerificationEmail,
      refreshVerificationStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
