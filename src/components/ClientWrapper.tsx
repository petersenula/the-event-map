'use client';

import React, { useEffect, useState } from 'react';
import InstallPrompt from './InstallPrompt';
import { useSessionReady } from '@/hooks/useSessionReady';
import { useSupabaseAuthListener } from '@/hooks/useSupabaseAuthListener';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useSessionReady(); // проверка сессии при старте
  useSupabaseAuthListener(); // слушаем изменения сессии

  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimeoutReached(true), 15000); // макс. 15 сек
    return () => clearTimeout(timer);
  }, []);

  const showLoadingNotice = !ready && !timeoutReached;

  return (
    <>
      <InstallPrompt />
      {children}
      {showLoadingNotice && (
        <div className="fixed bottom-4 right-4 z-50 bg-white text-gray-700 px-3 py-2 text-sm rounded shadow-lg border border-gray-200 opacity-90">
          Loading session...
        </div>
      )}
    </>
  );
}
