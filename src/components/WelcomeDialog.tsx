'use client';

import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WelcomeDialogProps {
  show: boolean;
  onClose: () => void;
  mapReady: boolean;
  mapRef: React.RefObject<google.maps.Map | null>;
  fetchEventsInBounds: (bounds?: google.maps.LatLngBounds | null) => void | Promise<void>;
}

export default function WelcomeDialog({
  show,
  onClose,
  mapReady,
  mapRef,
  fetchEventsInBounds,
}: WelcomeDialogProps) {
  const { t } = useTranslation('auth');

  if (!show) return null;

    const handleStart = async () => {
    if (!mapRef.current) return;
    const b = mapRef.current.getBounds();
    if (b) {
        await fetchEventsInBounds(b);
    }
    onClose();
    };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center">
      {/* фон */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* окно */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-[90%] p-6 border border-gray-300 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-800">
          {t('welcome.title')}
        </h2>
        <p className="text-sm text-gray-600">{t('welcome.subtitle')}</p>

        <button
          onClick={handleStart}
          disabled={!mapReady}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold border border-black text-gray-800 hover:bg-gray-100 disabled:opacity-60"
        >
          {!mapReady && <Loader2 className="w-4 h-4 animate-spin" />}
          {mapReady ? t('welcome.start') : t('welcome.preparing')}
        </button>
      </div>
    </div>
  );
}
