'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'; // важно!
import { NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL } from '@/lib/constants';

const supabase = createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log('[CALLBACK] Session:', data, error);

      // Редирект на главную
      router.replace('/');
    };

    run();
  }, [router]);

  return <p>Processing login...</p>;
}
