'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client'; // ✅ используем готовый клиент

export default function Confirm() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Confirmation error:', error);
      } else {
        router.replace('/'); // ✅ перенаправляем на главную
      }
    };

    run();
  }, [router]);

  return <p>Confirming...</p>;
}
