import { Profile, Role } from '../types';
import { PROFILES } from '../data/demo-data';
import { supabase, supabaseConfigurationError } from '../lib/supabase';

const STORAGE_KEY = 'sentra_property_users_v2';

const loadData = (): Profile[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(PROFILES));
  return PROFILES;
};

const saveData = (data: Profile[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save users:', err);
  }
};

export const userRepository = {
  findAll: (): Profile[] => {
    return loadData();
  },

  findAllAsync: async (): Promise<Profile[]> => {
    if (!supabase) {
      if (supabaseConfigurationError) throw new Error(supabaseConfigurationError);
      return loadData();
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id,username,full_name,phone,role,created_at')
      .order('created_at', { ascending: true });
    if (error) throw new Error('Gagal memuat profil agen dari Supabase.', { cause: error });

    return (data || []).map(profile => {
      if (
        profile.role !== 'super_admin' && profile.role !== 'admin'
        && profile.role !== 'internal_agent' && profile.role !== 'partner_agent'
      ) {
        throw new Error('Role profil agen dari Supabase tidak valid.');
      }
      return {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name || 'Agen Sentra Property',
        email: '',
        phone: profile.phone || '',
        role: profile.role,
        status: 'active' as const,
        joined_at: profile.created_at,
      };
    });
  },

  findById: (id: string): Profile | undefined => {
    return loadData().find(p => p.id === id);
  },

  findByRole: (role: Role): Profile[] => {
    return loadData().filter(p => p.role === role);
  },

  getAgents: (): Profile[] => {
    return loadData().filter(p => p.role === 'internal_agent' || p.role === 'partner_agent');
  },

  toggleStatus: (id: string): Profile | undefined => {
    const current = loadData();
    let updated: Profile | undefined;
    const next = current.map(item => {
      if (item.id === id) {
        updated = {
          ...item,
          status: item.status === 'active' ? 'inactive' : 'active',
        };
        return updated;
      }
      return item;
    });
    saveData(next);
    return updated;
  },

  create: (profile: Omit<Profile, 'id' | 'joined_at'>): Profile => {
    const newProfile: Profile = {
      ...profile,
      id: `user-${Date.now()}`,
      joined_at: new Date().toISOString(),
    };
    const current = loadData();
    const next = [...current, newProfile];
    saveData(next);
    return newProfile;
  },

  updateRole: (id: string, role: Role): Profile | undefined => {
    let updatedProfile: Profile | undefined;
    const next = loadData().map(profile => {
      if (profile.id !== id) return profile;
      updatedProfile = { ...profile, role };
      return updatedProfile;
    });
    saveData(next);
    return updatedProfile;
  },
};
