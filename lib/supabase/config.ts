export function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    url,
    key
  };
}

export function getSupabaseEnv() {
  const env = readSupabaseEnv();

  if (!env) {
    throw new Error(
      "Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return env;
}

export function hasSupabaseEnv() {
  return readSupabaseEnv() !== null;
}
