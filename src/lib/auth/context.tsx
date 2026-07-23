'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  nombre: string;
  apellido: string | null;
  rol: 'admin' | 'empleador' | 'empleado';
  empleador_id: string | null;
  trabajador_id: string | null;
  onboarding_completado: boolean;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Singleton client - no recreations
  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(async (authUser: User) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .single();

    if (data) {
      setProfile(data);
    } else {
      // Fallback from auth metadata (Google OAuth first login)
      setProfile({
        id: '',
        auth_user_id: authUser.id,
        email: authUser.email || '',
        nombre: authUser.user_metadata?.full_name || authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
        apellido: authUser.user_metadata?.apellido || null,
        rol: 'empleador',
        empleador_id: null,
        trabajador_id: null,
        onboarding_completado: false,
        avatar_url: authUser.user_metadata?.avatar_url || null,
      });
    }
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    // Single init call - no duplicates
    supabase.auth.getUser().then(({ data: { user: u } }: { data: { user: User | null } }) => {
      if (!mounted) return;
      setUser(u);
      if (u) {
        loadProfile(u).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user: User | null } | null) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          loadProfile(u).finally(() => mounted && setLoading(false));
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase, loadProfile]);

  const signOut = useCallback(() => {
    setUser(null);
    setProfile(null);
    supabase.auth.signOut().catch(() => {});
    window.location.href = '/auth/login';
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
