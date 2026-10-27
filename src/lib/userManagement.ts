import { Role } from '../types';
import { supabase } from './supabase';

export interface ManagedUser {
  id: string;
  username: string;
  full_name: string;
  phone: string;
  role: Role;
  created_at: string;
}

const isRole = (value: unknown): value is Role => (
  value === 'super_admin' || value === 'admin'
  || value === 'internal_agent' || value === 'partner_agent'
);

const isManagedUser = (value: unknown): value is ManagedUser => {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === 'string'
    && typeof user.username === 'string'
    && typeof user.full_name === 'string'
    && typeof user.phone === 'string'
    && isRole(user.role)
    && typeof user.created_at === 'string';
};

const invokeUserManagement = async (body: Record<string, unknown>): Promise<unknown> => {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi untuk manajemen user.');
  const { data, error } = await supabase.functions.invoke('user-management', { body });
  if (error) {
    let message = error.message || 'Permintaan manajemen user gagal.';
    if ('context' in error && error.context instanceof Response) {
      try {
        const responseBody = await error.context.json() as { error?: unknown };
        if (typeof responseBody.error === 'string') message = responseBody.error;
      } catch {
        // Keep the Supabase Functions error when the response has no JSON body.
      }
    }
    throw new Error(message, { cause: error });
  }
  const response = data as { error?: unknown } | null;
  if (response && typeof response.error === 'string') throw new Error(response.error);
  return data;
};

export const userManagement = {
  list: async (): Promise<ManagedUser[]> => {
    const data = await invokeUserManagement({ action: 'list' }) as { users?: unknown };
    if (!Array.isArray(data?.users) || !data.users.every(isManagedUser)) {
      throw new Error('Respons daftar user dari server tidak valid.');
    }
    return data.users;
  },

  create: async (input: {
    username: string;
    password: string;
    fullName: string;
    phone: string;
    role: Role;
  }): Promise<ManagedUser> => {
    const data = await invokeUserManagement({ action: 'create', ...input }) as { user?: unknown };
    if (!isManagedUser(data?.user)) throw new Error('Respons user baru dari server tidak valid.');
    return data.user;
  },

  updateRole: async (userId: string, role: Role): Promise<void> => {
    await invokeUserManagement({ action: 'update_role', userId, role });
  },

  resetPassword: async (userId: string, password: string): Promise<void> => {
    await invokeUserManagement({ action: 'reset_password', userId, password });
  },
};
