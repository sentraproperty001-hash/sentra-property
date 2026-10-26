import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasSupabaseUrl = Boolean(supabaseUrl?.trim());
const hasSupabaseKey = Boolean(supabaseAnonKey?.trim());
const normalizedSupabaseUrl = supabaseUrl?.trim() || '';
const normalizedSupabaseKey = supabaseAnonKey?.trim() || '';

export const supabaseConfigurationError = hasSupabaseUrl !== hasSupabaseKey
  ? 'Konfigurasi Supabase belum lengkap. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.'
  : null;

export const supabase = hasSupabaseUrl && hasSupabaseKey
  ? createClient(normalizedSupabaseUrl, normalizedSupabaseKey)
  : null;
