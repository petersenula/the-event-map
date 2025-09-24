'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    // Не ждём сессию, просто идём на главную
    router.replace('/');

    // ⚠️ Авто-восстановление сессии будет происходить в фоне
    // через useSupabaseAuthListener + useSessionReady
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center text-gray-700 text-sm">
      Processing authorisation...
    </div>
  );
}
