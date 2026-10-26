import { ActivityLog, Role } from '../types';
import { INITIAL_ACTIVITIES } from '../data/demo-data';

const STORAGE_KEY = 'sentra_property_activities_v2';

const loadData = (): ActivityLog[] => {
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ACTIVITIES));
  return INITIAL_ACTIVITIES;
};

const saveData = (data: ActivityLog[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save activities:', err);
  }
};

export const activityRepository = {
  findAll: (): ActivityLog[] => {
    const data = loadData();
    return [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  log: (params: {
    user_id: string;
    user_name: string;
    user_role: Role;
    action: ActivityLog['action'];
    entity_type: ActivityLog['entity_type'];
    entity_id: string;
    entity_title: string;
    details?: string;
  }): ActivityLog => {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: params.user_id,
      user_name: params.user_name,
      user_role: params.user_role,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      entity_title: params.entity_title,
      details: params.details,
      created_at: new Date().toISOString(),
    };

    const current = loadData();
    const updated = [newLog, ...current];
    saveData(updated);
    return newLog;
  },

  clearAll: () => {
    saveData([]);
  },
};
