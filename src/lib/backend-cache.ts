const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID || "";

/**
 * Creates a storage key scoped to the current Supabase project.
 * This prevents cache collisions when switching between projects.
 */
export function getScopedStorageKey(baseKey: string): string {
  return SUPABASE_PROJECT_ID ? `${SUPABASE_PROJECT_ID}:${baseKey}` : baseKey;
}

export function getScopedStoragePrefix(basePrefix: string): string {
  return SUPABASE_PROJECT_ID ? `${SUPABASE_PROJECT_ID}:${basePrefix}:` : `${basePrefix}:`;
}
