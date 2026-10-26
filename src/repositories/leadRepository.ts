import { Lead } from '../types';
import { INITIAL_LEADS } from '../data/demo-data';
import { supabase, supabaseConfigurationError } from '../lib/supabase';

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

  findAllAsync: async (): Promise<Lead[]> => {
    if (!supabase) {
      if (supabaseConfigurationError) throw new Error(supabaseConfigurationError);
      return leadRepository.findAll();
    }

    const { data, error } = await supabase
      .from('leads')
      .select('id,property_id,assigned_agent_id,full_name,phone,email,message,status,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error('Gagal memuat pesan minat dari Supabase.', { cause: error });

    return (data || []).map(row => ({
      id: row.id,
      property_id: row.property_id || undefined,
      assigned_agent_id: row.assigned_agent_id || undefined,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email || undefined,
      message: row.message || '',
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at || undefined,
    }));
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

  submitPublicInterest: async (lead: Pick<Lead, 'property_id' | 'assigned_agent_id' | 'full_name' | 'phone' | 'message'>): Promise<void> => {
    if (!supabase) {
      if (supabaseConfigurationError) throw new Error(supabaseConfigurationError);
      leadRepository.create({ ...lead, status: 'new' });
      return;
    }

    const { error } = await supabase.from('leads').insert({
      property_id: lead.property_id,
      assigned_agent_id: lead.assigned_agent_id,
      full_name: lead.full_name,
      phone: lead.phone,
      message: lead.message,
      status: 'new',
    });
    if (error) {
      throw new Error('Pesan minat belum terkirim. Silakan coba lagi atau hubungi kami melalui WhatsApp.', { cause: error });
    }
  },

  updateStatusAsync: async (id: string, status: Lead['status']): Promise<void> => {
    if (!supabase) {
      if (supabaseConfigurationError) throw new Error(supabaseConfigurationError);
      leadRepository.updateStatus(id, status);
      return;
    }

    const { data, error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error('Status pesan minat tidak dapat diperbarui.', { cause: error });
    if (!data) throw new Error('Pesan minat tidak ditemukan atau tidak dapat diakses akun ini.');
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
