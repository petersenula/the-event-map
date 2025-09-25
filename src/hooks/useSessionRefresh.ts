'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export function useSessionRefresh() {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const check = async () => {
      console.log('🌙 Проверка сессии после возврата');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.warn('⚠️ Сессия потеряна');
        // даём шанс на авто-восстановление через пару секунд
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            setSessionExpired(true); // показываем диалог
          }
        }, 2000);
      }
    };

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('focus', check);

    return () => {
      window.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);

  return { sessionExpired, setSessionExpired };
}
