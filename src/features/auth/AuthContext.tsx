import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Role } from '../../types';
import { PROFILES } from '../../data/demo-data';
import { userRepository } from '../../repositories/userRepository';

const AUTH_STORAGE_KEY = 'sentra_property_auth_user_v2';

interface AuthContextType {
  currentUser: Profile;
  allProfiles: Profile[];
  switchUser: (userId: string) => void;
  login: (email: string) => boolean;
  logout: () => void;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  canApproveListing: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allProfiles, setAllProfiles] = useState<Profile[]>(() => userRepository.findAll());
  const [currentUser, setCurrentUser] = useState<Profile>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          const fresh = userRepository.findById(parsed.id);
          if (fresh) return fresh;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    // Default to Super Admin for immediate testing
    return PROFILES[0];
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } catch (err) {
      console.warn('Failed to persist auth state:', err);
    }
  }, [currentUser]);

  const switchUser = (userId: string) => {
    const target = allProfiles.find(p => p.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const login = (email: string): boolean => {
    const found = allProfiles.find(p => p.email.toLowerCase() === email.toLowerCase().trim());
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    // Switch to agent or default guest/admin
    setCurrentUser(PROFILES[0]);
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
        switchUser,
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
