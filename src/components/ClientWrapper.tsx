'use client';

import { useSessionReady } from '../hooks/useSessionReady';
import { useSupabaseAuthListener } from '../hooks/useSupabaseAuthListener';
import InstallPrompt from './InstallPrompt';
import { useEffect, useState } from 'react';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useSessionReady();    // проверка сессии при старте
  useSupabaseAuthListener();          // слушаем изменения сессии

  const [timeoutReached, setTimeoutReached] = useState(false);
  const [showError, setShowError] = useState(false);

  {showError && (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white text-black border px-4 py-3 rounded-xl shadow-md z-50 text-sm">
      ⚠️ Authorization failed. <br />
      <button
        onClick={() => window.location.href = '/'}
        className="mt-2 underline text-blue-600 hover:text-blue-800"
      >
        Click here to reload or sign in again
      </button>
    </div>
  )}

  return (
    <>
      <InstallPrompt />
      {children}
    </>
  );
}
