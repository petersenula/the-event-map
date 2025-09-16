'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

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
