import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export function useSessionReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        console.log('👤 Supabase session:', session); // для отладки

        if (isMounted) setReady(true); // Устанавливаем готовность в любом случае
      } catch (err) {
        console.error('❌ Ошибка при получении сессии:', err);
        if (isMounted) setReady(true); // Всё равно продолжаем
      }
    };

    check();

    return () => {
      isMounted = false;
    };
  }, []);

  return ready;
}
