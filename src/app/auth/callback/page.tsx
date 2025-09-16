'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function Callback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const waitForSession = async () => {
      let tries = 0;
      while (tries < 10) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          break;
        }
        await new Promise((res) => setTimeout(res, 300)); // подождать 300ms
        tries++;
      }
      setLoading(false);
      router.replace('/');
    };

    waitForSession();
  }, [router]);

  return <p>Processing authorisation...</p>;
}
