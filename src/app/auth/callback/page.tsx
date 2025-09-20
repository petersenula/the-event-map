'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('[Callback] session OK → redirect to /');
      } else {
        console.warn('[Callback] no session found');
      }
      router.replace('/');
    });
  }, [router]);

  return <p>Processing authorisation…</p>;
}
