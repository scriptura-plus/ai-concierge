import { createClient } from '@supabase/supabase-js';

// Проверяем, что переменные окружения заданы, чтобы избежать ошибок в будущем
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Supabase environment variables are not set. Please check your .env file.");
}

// Создаем и экспортируем единый клиент Supabase для использования на сервере
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      // Важно: отключаем авто-обновление токена для серверного клиента
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);