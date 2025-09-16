'use client';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { useTranslations } from 'next-intl';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function Confirm() {
  const router = useRouter();
  const t = useTranslations('auth');

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error(t('confirmation_error'), error);
        alert(t('confirmation_error'));
      } else {
        router.replace('/');
      }
    };

    run();
  }, [router, t]);

  return <p>{t('confirming')}</p>;
}
