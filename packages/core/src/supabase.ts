import { createClient } from '@supabase/supabase-js';

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length ? v : undefined;
}

export function getSupabaseAdmin() {
  const url =
    getEnv('SUPABASE_URL') ??
    getEnv('NEXT_PUBLIC_SUPABASE_URL'); // публичный URL не секрет, можно использовать как запасной

  const key =
    getEnv('SUPABASE_SERVICE_KEY') ??
    getEnv('SUPABASE_SERVICE_ROLE_KEY'); // поддерживаем оба названия

  if (!url || !key) {
    throw new Error('Supabase environment variables are not set. Check Vercel ENV (Preview/Production).');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
