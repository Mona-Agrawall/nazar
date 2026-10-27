/** Supabase settings, read lazily so dotenv has loaded before first use. */
export function getSupabaseConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL || '',
    publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || '',
  };
}

export function isSupabaseConfigured(): boolean {
  const { url, publishableKey } = getSupabaseConfig();
  return Boolean(url && publishableKey);
}

/** Demo mode: explicitly enabled, or implied when Supabase is not configured (nobody could sign in). */
export function isDemoMode(): boolean {
  return process.env.VITE_DEMO_MODE === 'true' || !isSupabaseConfigured();
}
