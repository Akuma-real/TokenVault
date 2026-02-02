import "server-only";

function requireNonEmptyEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  get SUPABASE_URL() {
    return requireNonEmptyEnv("SUPABASE_URL");
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return requireNonEmptyEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get ADMIN_PASSWORD() {
    return requireNonEmptyEnv("ADMIN_PASSWORD");
  },
};
