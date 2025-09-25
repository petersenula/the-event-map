'use client';

import { useSessionReady } from '../hooks/useSessionReady';
import { useSupabaseAuthListener } from '../hooks/useSupabaseAuthListener';
import InstallPrompt from './InstallPrompt';
import { useEffect, useState } from 'react';
import { useEventFromUrl } from '@/context/EventContext';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useSessionReady();    // проверка сессии при старте
  useSupabaseAuthListener();          // слушаем изменения сессии

  const [timeoutReached, setTimeoutReached] = useState(false);
  const [showError, setShowError] = useState(false);
  const { setEventIdFromUrl } = useEventFromUrl();

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

  useEffect(() => {
    const bc = new BroadcastChannel('eventmap_channel');
    const url = new URL(window.location.href);
    const eventId = url.searchParams.get('event');

    if (eventId) {
      // отправляем в другую вкладку и закрываем
      bc.postMessage({
        type: 'open-event',
        eventId,
      });
      console.log('[Broadcast] Отправили событие в основную вкладку:', eventId);

      // даем время сообщению отправиться, потом закрываем
      setTimeout(() => {
        window.close(); // закроется только если открыто через window.open
        // если не сработает, можно редирект:
        window.location.href = '/';
      }, 300);
    }

    bc.onmessage = (event) => {
      if (event.data?.type === 'open-event') {
        const eventId = event.data.eventId;
        console.log('[Broadcast] Открываем событие в текущей вкладке:', eventId);
        setEventIdFromUrl(eventId); // твоя логика
      }
    };

    return () => bc.close();
  }, []);

  return (
    <>
      <InstallPrompt />
      {children}
    </>
  );
}
