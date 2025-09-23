'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export function useSessionReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🟢 Supabase session при старте:', session);
      } catch (err) {
        console.error('🔴 Ошибка при получении сессии:', err);
      } finally {
        if (isMounted) setReady(true);
      }
    };

    check();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
  supabase.auth.startAutoRefresh();
  return () => supabase.auth.stopAutoRefresh();
}, []);

  return ready;
}
