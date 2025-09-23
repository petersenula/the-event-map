'use client';

import { createBrowserClient } from '@supabase/ssr';

// Единый инстанс Supabase для клиентских компонентов
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,      // хранить сессию в storage
      autoRefreshToken: true,    // автообновление рефреш-токена
      detectSessionInUrl: true,  // подхватывать сессию из редиректов OAuth/Magic Link
    },
  }
);
