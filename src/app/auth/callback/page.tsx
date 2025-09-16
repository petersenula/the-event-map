'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client'; // ✅ правильный импорт

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log('[CALLBACK] Session:', data, error);
      router.replace('/');
    };
    run();
  }, [router]);

  return <p>Processing login...</p>;
}
