'use client';

import { useSessionReady } from '../hooks/useSessionReady';
import FullScreenLoader from './FullScreenLoader';
import InstallPrompt from './InstallPrompt';
import { useEffect, useState } from 'react';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useSessionReady();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimeoutReached(true), 15000); // макс. 15 сек
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return <FullScreenLoader />;
  if (!ready && timeoutReached)
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white bg-black bg-opacity-80 p-4 text-center">
        Load has failed. Please reload the page.
      </div>
    );

  return (
    <>
      <InstallPrompt />
      {children}
    </>
  );
}
