import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

const authStorage = {
  getItem: (key) => {
    try {
      const value = window.localStorage.getItem(key);
      console.log(`[AuthStorage] Getting ${key}:`, value ? 'exists' : 'missing');
      return value;
    } catch {
      console.error(`[AuthStorage] Error getting ${key}`);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      console.log(`[AuthStorage] Setting ${key}:`, value ? 'success' : 'empty');
      window.localStorage.setItem(key, value);
    } catch {
      console.error(`[AuthStorage] Error setting ${key}`);
      // Ignore storage errors
    }
  },
  removeItem: (key) => {
    try {
      console.log(`[AuthStorage] Removing ${key}`);
      window.localStorage.removeItem(key);
    } catch {
      console.error(`[AuthStorage] Error removing ${key}`);
      // Ignore storage errors
    }
  },
};

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
