'use client';

import { useSessionReady } from '../hooks/useSessionReady';
import FullScreenLoader from './FullScreenLoader';

export default function ClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useSessionReady();

  if (!ready) return <FullScreenLoader />;
  return <>{children}</>;
}
