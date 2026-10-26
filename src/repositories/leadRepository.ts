import { Lead } from '../types';
import { INITIAL_LEADS } from '../data/demo-data';

const STORAGE_KEY = 'sentra_property_leads_v2';

const loadData = (): Lead[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LEADS));
  return INITIAL_LEADS;
};

const saveData = (data: Lead[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save leads:', err);
  }
};

export const leadRepository = {
  findAll: (): Lead[] => {
    const data = loadData();
    return [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  findById: (id: string): Lead | undefined => {
    return loadData().find(l => l.id === id);
  },

  findByAgent: (agentId: string): Lead[] => {
    return loadData()
      .filter(l => l.assigned_agent_id === agentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  create: (lead: Omit<Lead, 'id' | 'created_at'>): Lead => {
    const newLead: Lead = {
      ...lead,
      id: `lead-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const current = loadData();
    const updated = [newLead, ...current];
    saveData(updated);
    return newLead;
  },

  updateStatus: (id: string, status: Lead['status'], notes?: string): Lead | undefined => {
    const current = loadData();
    let updatedLead: Lead | undefined;
    const next = current.map(item => {
      if (item.id === id) {
        updatedLead = {
          ...item,
          status,
          ...(notes !== undefined ? { notes } : {}),
          updated_at: new Date().toISOString(),
        };
        return updatedLead;
      }
      return item;
    });
    saveData(next);
    return updatedLead;
  },

  updateNotes: (id: string, notes: string): Lead | undefined => {
    const current = loadData();
    let updatedLead: Lead | undefined;
    const next = current.map(item => {
      if (item.id === id) {
        updatedLead = {
          ...item,
          notes,
          updated_at: new Date().toISOString(),
        };
        return updatedLead;
      }
      return item;
    });
    saveData(next);
    return updatedLead;
  },

  delete: (id: string) => {
    const current = loadData();
    const filtered = current.filter(item => item.id !== id);
    saveData(filtered);
  },
};
