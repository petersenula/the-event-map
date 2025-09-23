'use client';
import { useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';

export function useSupabaseAuthListener() {
  useEffect(() => {
    console.log('🔑 Подключаем onAuthStateChange');

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('📡 Auth event:', event, session);

      if (event === 'TOKEN_REFRESHED') {
        console.log('♻️ Токен обновился автоматически');
      }

      if (event === 'SIGNED_OUT') {
        console.log('🚪 Пользователь вышел');
      }

      if (event === 'SIGNED_IN') {
        console.log('✅ Пользователь вошёл');
      }

      // ⬇️ если сессии нет — пробуем восстановить
      if (!session) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          console.log('🔄 Сессия восстановлена через getSession()', data.session);
        } else {
          console.warn('❌ Сессия не восстановилась, нужен логин');
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
}
