export function getSupabaseEnvErrorMessage(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return "Supabase configuration is missing. Please check your environment variables.";
  }

  return null;
}
