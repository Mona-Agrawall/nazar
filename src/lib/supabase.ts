import { SupabaseClient, createClient } from '@supabase/supabase-js';

// These variables are injected by Vite at build/dev time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase URL or Publishable Key is missing — running in demo mode without sign-in.');
}

// A single supabase client, or null when Supabase is not configured (demo mode only).
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
