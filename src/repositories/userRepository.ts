import { Profile, Role } from '../types';
import { PROFILES } from '../data/demo-data';

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
};
