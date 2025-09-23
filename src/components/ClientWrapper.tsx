'use client';

import { useSessionReady } from '../hooks/useSessionReady';
import { useSupabaseAuthListener } from '../hooks/useSupabaseAuthListener';
import InstallPrompt from './InstallPrompt';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const ready = useSessionReady();    // проверка сессии при старте
  useSupabaseAuthListener();          // слушаем изменения сессии

  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimeoutReached(true), 15000); // макс. 15 сек
    return () => clearTimeout(timer);
  }, []);

  if (!ready && timeoutReached) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white bg-black bg-opacity-80 p-4 text-center">
        {t('auth.load_failed')}
      </div>
    );
  }

  return (
    <>
      <InstallPrompt />
      {children}
    </>
  );
}
