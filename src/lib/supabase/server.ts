/**
 * Supabase-клиент для серверных роутов.
 *
 * Читает и пишет сессию через cookies текущего запроса — так же, как это
 * делает браузерный клиент, только на сервере.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Вызов из серверного компонента, а не из роута — cookies там
          // только читаются. Middleware обновит сессию отдельно.
        }
      },
    },
  });
}
