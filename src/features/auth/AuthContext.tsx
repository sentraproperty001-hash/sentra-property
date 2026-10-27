import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, Role } from '../../types';
import { PROFILES } from '../../data/demo-data';
import { userRepository } from '../../repositories/userRepository';
import { isDemoMode, supabase, supabaseConfigurationError } from '../../lib/supabase';
import { isEmailLogin, normalizeUsername } from '../../lib/usernameAuth';

const AUTH_STORAGE_KEY = 'sentra_property_auth_user_v2';
const isRole = (value: unknown): value is Role => (
  value === 'super_admin' || value === 'admin' || value === 'internal_agent' || value === 'partner_agent'
);

interface AuthContextType {
  currentUser: Profile;
  allProfiles: Profile[];
  isDemoMode: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  switchUser: (userId: string) => void;
  refreshDemoProfiles: () => void;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  canApproveListing: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allProfiles, setAllProfiles] = useState<Profile[]>(() => (
    isDemoMode ? userRepository.findAll() : []
  ));
  const [currentUser, setCurrentUser] = useState<Profile>(PROFILES[0]);
  const [isLoading, setIsLoading] = useState(!isDemoMode && Boolean(supabase));
  const [isAuthenticated, setIsAuthenticated] = useState(isDemoMode);
  const [authError, setAuthError] = useState<string | null>(
    supabaseConfigurationError || (!isDemoMode && !supabase ? 'Supabase belum dikonfigurasi untuk autentikasi portal.' : null)
  );

  useEffect(() => {
    if (isDemoMode) {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.id === 'string') {
            const fresh = userRepository.findById(parsed.id);
            if (fresh) setCurrentUser(fresh);
          }
        }
      } catch (error) {
        console.warn('Failed to restore demo auth state:', error);
      }
      return;
    }

    const authClient = supabase;
    if (!authClient) {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }

    let active = true;
    const loadProfile = async (userId: string, email: string) => {
      const { data, error } = await authClient
        .from('profiles')
        .select('id,username,full_name,phone,role,created_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw new Error('Gagal memuat profil akun dari Supabase.', { cause: error });
      }
      if (!data || !isRole(data.role)) {
        throw new Error('Akun belum memiliki profil Sentra Property dengan role yang valid. Hubungi administrator.');
      }

      const profile: Profile = {
        id: data.id,
        username: data.username || email.split('@')[0],
        full_name: data.full_name || email,
        email,
        phone: data.phone || '',
        role: data.role,
        status: 'active',
        joined_at: data.created_at,
      };
      if (!active) return profile;

      setCurrentUser(profile);
      setAllProfiles([profile]);
      setIsAuthenticated(true);
      setAuthError(null);
      return profile;
    };

    const setSignedOut = () => {
      if (!active) return;
      setCurrentUser(PROFILES[0]);
      setAllProfiles([]);
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    const loadSession = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await authClient.auth.getSession();
        if (error) throw error;
        if (data.session) {
          await loadProfile(data.session.user.id, data.session.user.email || '');
        } else {
          setSignedOut();
        }
      } catch (error) {
        if (active) {
          setIsAuthenticated(false);
          setAuthError(error instanceof Error ? error.message : 'Gagal memuat sesi akun.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadSession();
    const { data: { subscription } } = authClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setSignedOut();
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setIsLoading(true);
        queueMicrotask(() => {
          void loadProfile(session.user.id, session.user.email || '')
            .catch((error: unknown) => {
              if (!active) return;
              setIsAuthenticated(false);
              setAuthError(error instanceof Error ? error.message : 'Gagal memuat profil akun.');
            })
            .finally(() => {
              if (active) setIsLoading(false);
            });
        });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const switchUser = (userId: string) => {
    if (!isDemoMode) return;
    const target = allProfiles.find(p => p.id === userId);
    if (target) {
      setCurrentUser(target);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(target));
      } catch (error) {
        console.warn('Failed to persist demo auth state:', error);
      }
    }
  };

  const refreshDemoProfiles = () => {
    if (isDemoMode) setAllProfiles(userRepository.findAll());
  };

  const loadAuthenticatedProfile = useCallback(async (userId: string, email: string) => {
    if (!supabase) throw new Error(supabaseConfigurationError || 'Supabase belum dikonfigurasi.');
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,full_name,phone,role,created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw new Error('Gagal memuat profil akun dari Supabase.', { cause: error });
    if (!data || !isRole(data.role)) {
      throw new Error('Akun belum memiliki profil Sentra Property dengan role yang valid. Hubungi administrator.');
    }
    const profile: Profile = {
      id: data.id,
      username: data.username || email.split('@')[0],
      full_name: data.full_name || email,
      email,
      phone: data.phone || '',
      role: data.role,
      status: 'active',
      joined_at: data.created_at,
    };
    setCurrentUser(profile);
    setAllProfiles([profile]);
    setIsAuthenticated(true);
    setAuthError(null);
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const loginIdentifier = usernameOrEmail.trim();
    if (isDemoMode) {
      const username = normalizeUsername(loginIdentifier);
      const found = allProfiles.find(p => (
        p.email.toLowerCase() === username
        || p.username?.toLowerCase() === username
        || !isEmailLogin(loginIdentifier) && p.email.toLowerCase().startsWith(`${username}@`)
      ));
      if (!found) throw new Error('Username tidak terdaftar di akun demo. Pilih salah satu profil demo.');
      setCurrentUser(found);
      setIsAuthenticated(true);
      return;
    }
    if (supabaseConfigurationError) throw new Error(supabaseConfigurationError);
    if (!supabase) throw new Error('Supabase belum dikonfigurasi untuk autentikasi portal.');

    setIsLoading(true);
    setAuthError(null);
    try {
      if (isEmailLogin(loginIdentifier)) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginIdentifier,
          password,
        });
        if (error) throw new Error(error.message);
        if (!data.user) throw new Error('Supabase tidak mengembalikan akun setelah login.');
        await loadAuthenticatedProfile(data.user.id, data.user.email || loginIdentifier);
      } else {
        const { data, error } = await supabase.functions.invoke('username-login', {
          body: { username: normalizeUsername(loginIdentifier), password },
        });
        if (error) throw new Error(error.message || 'Login dengan username gagal.');
        const response = data as {
          session?: { access_token?: unknown; refresh_token?: unknown };
          error?: unknown;
        } | null;
        if (typeof response?.error === 'string') throw new Error(response.error);
        if (
          typeof response?.session?.access_token !== 'string'
          || typeof response.session.refresh_token !== 'string'
        ) {
          throw new Error('Server login username mengembalikan sesi yang tidak valid.');
        }
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });
        if (sessionError) throw new Error('Sesi login username gagal disimpan.', { cause: sessionError });
        if (!sessionData.user) throw new Error('Supabase tidak mengembalikan akun setelah login username.');
        await loadAuthenticatedProfile(sessionData.user.id, sessionData.user.email || loginIdentifier);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login gagal.';
      setAuthError(message);
      throw new Error(message, { cause: error });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isDemoMode) {
      setCurrentUser(PROFILES[0]);
      setIsAuthenticated(true);
      return;
    }
    if (!supabase) {
      setIsAuthenticated(false);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Gagal keluar dari akun Supabase.', { cause: error });
    setCurrentUser(PROFILES[0]);
    setAllProfiles([]);
    setIsAuthenticated(false);
    setAuthError(null);
  };

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';
  const isAgent = currentUser.role === 'internal_agent' || currentUser.role === 'partner_agent';
  const canApproveListing = isAdmin;
  const canManageUsers = isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allProfiles,
        isDemoMode,
        isLoading,
        isAuthenticated,
        authError,
        switchUser,
        refreshDemoProfiles,
        login,
        logout,
        isSuperAdmin,
        isAdmin,
        isAgent,
        canApproveListing,
        canManageUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
