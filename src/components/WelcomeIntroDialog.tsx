'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Filter, Search, Heart, Share2, CalendarPlus, User, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type LangItem = { code: string; label: string };

type Props = {
  show: boolean;
  onClose: () => void;
  availableLanguages: LangItem[];
  currentLang: string;
  onChangeLanguage: (code: string) => void;
};

export default function WelcomeIntroDialog({
  show,
  onClose,
  availableLanguages,
  currentLang,
  onChangeLanguage,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex items-center justify-center">
      {/* затемнённый фон */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[11999]" />

      {/* модальное окно */}
      <div className="relative w-[92vw] sm:w-[85vw] md:w-[600px] bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 md:p-8 text-gray-800 z-[12001] max-h-[90vh] overflow-y-auto animate-[fadeInScale_0.4s_ease-out_forwards]">
        {/* Заголовок */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              {t('welcome.title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1 leading-snug">
              {t('welcome.tagline')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Выбор языка */}
        <div className="mt-3">
          <p className="text-sm font-semibold mb-2">{t('welcome.choose')}</p>
          <div className="flex flex-wrap gap-2">
            {availableLanguages.map(({ code, label }) => {
                const isActive = code === currentLang;
                return (
                    <button
                    key={code}
                    onClick={() => onChangeLanguage(code)}
                    className={`px-3 py-1 rounded-full border text-sm transition
                        ${isActive
                        ? 'bg-gray-200 border-gray-400 text-gray-800 font-medium'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'}
                    `}
                    >
                    {label}
                    </button>
                );
                })}
          </div>
        </div>

        {/* Инструкции */}
        <div className="mt-6 space-y-2">
          <h3 className="text-base font-semibold mb-3">{t('welcome.howtoTitle')}</h3>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-gray-600" />
              <span>{t('welcome.howto.0')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span>{t('welcome.howto.1')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-600" />
              <span>{t('welcome.howto.2')}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 text-gray-600">📍</span>
              <span>{t('welcome.howto.3')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              <span>{t('welcome.howto.4')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-gray-600" />
              <span>{t('welcome.howto.5')}</span>
            </li>
            <li className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-gray-600" />
              <span>{t('welcome.howto.6')}</span>
            </li>
            <li className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-600" />
              <span>{t('welcome.howto.7')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Home className="w-4 h-4 text-gray-600" />
              <span>{t('welcome.howto.8')}</span>
            </li>
          </ul>
        </div>

        {/* Кнопка */}
        <div className="mt-8 flex justify-end">
            <button
                onClick={onClose}
                className="px-7 py-2 rounded-full border border-green-600 text-green-700 font-medium text-sm hover:bg-green-50 active:scale-[.98] transition"
            >
                {t('welcome.ctaStart') || 'Start exploring'}
            </button>
        </div>

      </div>

      {/* Анимация */}
      <style jsx>{`
        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
