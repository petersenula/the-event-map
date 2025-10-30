'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/utils/supabase/client';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const { t } = useTranslation();
  const session = useSession();

  // 1. Захватываем beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  // 2. Проверяем счётчик install_view_count
  useEffect(() => {
    const installed = localStorage.getItem('pwa_installed') === 'true';
    if (installed) return;

    const raw = localStorage.getItem('install_view_count');
    const count = raw ? parseInt(raw, 10) : 0;

    // Показываем, если кратно 10 (но не 0)
    if (count !== 0 && count % 10 === 0) {
      setShowInstallButton(true);
    }
  }, []);

  // 3. Обработка установки
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt as any;
    promptEvent.prompt();

    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      setShowInstallButton(false);

      if (session?.user) {
        await supabase
          .from('profiles')
          .update({ pwa_installed: true })
          .eq('id', session.user.id);
      }
    }
  };

  // 4. Ничего не показываем, если уже установлен
  if (!showInstallButton || localStorage.getItem('pwa_installed') === 'true') {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-4 right-4 bg-white border rounded-xl shadow-lg p-4 flex justify-between items-center z-50">
      <span className="text-sm font-medium">{t('install.title')}</span>
      <button
        className="ml-4 px-4 py-2 text-sm font-semibold text-white bg-black rounded-lg"
        onClick={handleInstallClick}
      >
        {t('install.button')}
      </button>
    </div>
  );
}
