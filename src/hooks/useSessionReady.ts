import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export function useSessionReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      let tries = 0;
      while (tries < 10) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session || tries >= 9) {
          if (isMounted) setReady(true);
          return;
        }
        await new Promise(res => setTimeout(res, 300));
        tries++;
      }
    };
    check();
    return () => { isMounted = false };
  }, []);

  return ready;
}
