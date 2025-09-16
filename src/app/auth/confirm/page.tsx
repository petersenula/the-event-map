'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'
import { NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL } from '@/lib/constants';

const supabase = createBrowserClient(
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Confirm() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Ошибка подтверждения:', error);
      } else {
        router.replace('/'); // 👈 перенаправляем на главную
      }
    };
    run();
  }, [router]);

  return <p>Подтверждаем…</p>;
}
