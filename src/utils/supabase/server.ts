import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Серверный клиент читает/пишет auth-куки.
// ВАЖНО: используем getAll/setAll — это текущая рекомендация Supabase для Next.js 14/15.
export async function createClient() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // В Server Component setAll может кидать — Supabase советует try/catch.
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* noop — в Server Components cookieStore может быть readonly */
          }
        },
      },
    }
  );

  return supabase;
}
