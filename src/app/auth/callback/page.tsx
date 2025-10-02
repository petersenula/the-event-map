'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';

export default function Callback() {
  const router = useRouter();

  useEffect(() => {
    // 🔹 Отправляем Conversion событие в Google Ads
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        send_to: 'AW-17615306742/mXuHCMTb4qUbEPb_0M9B',
        value: 1.0,
        currency: 'CHF',
        method: 'oauth', // можешь указать "google" или "email"
      });
    }

    // 🔹 Потом редиректим на главную
    router.replace('/');
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center text-gray-700 text-sm">
      Processing authorisation...
    </div>
  );
}
