import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  tagline: string | null;
  watermark_enabled: boolean;
  watermark_handle: string | null;
  watermark_position: string;
  owner_user_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  team: Team | null;
  teamLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  createTeam: (teamName: string, description?: string) => Promise<{ teamId: string | null; error: Error | null }>;
  refreshTeam: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchTeam = async () => {
    setTeamLoading(true);
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .maybeSingle();
    setTeam(data ?? null);
    setTeamLoading(false);
  };

  const refreshTeam = async () => {
    await fetchTeam();
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
            fetchTeam();
          }, 0);
        } else {
          setIsAdmin(false);
          setTeam(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        checkAdminRole(session.user.id);
        fetchTeam();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error };
  };

  const createTeam = async (teamName: string, description?: string) => {
    try {
      const { data, error } = await supabase.rpc('create_team_for_user', {
        p_team_name: teamName,
        p_description: description ?? null,
      });
      // If team already exists (409/duplicate), just fetch existing team
      if (error && (error.message.includes('already owns a team') || error.code === '23505')) {
        await fetchTeam();
        setIsAdmin(true);
        return { teamId: null, error: null };
      }
      if (error) throw error;
      await fetchTeam();
      setIsAdmin(true);
      return { teamId: data as string, error: null };
    } catch (err) {
      return { teamId: null, error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setTeam(null);
  };

  return (
    <AuthContext.Provider value={{
      user, session, isAdmin, loading,
      team, teamLoading,
      signIn, signUp, signOut, createTeam, refreshTeam
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
