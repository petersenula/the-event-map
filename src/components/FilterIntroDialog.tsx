'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { typeTranslationKeys } from '@/lib/typeTranslationKeys';

type Props = {
  show: boolean;
  onClose: () => void;
  onApply: (filters: { format: string[]; type: string[] }) => void;
  onShowFilters: () => void;
};

// ✅ варианты форматов — соответствуют Supabase
const formatOptions = ['any', 'children', 'adults'];

// ✅ предлагаемые типы (можно редактировать вручную)
const typeOptions = ['спорт', 'мастеркласс', 'фестиваль', 'ярмарка', 'детское'];

export default function FilterIntroDialog({ show, onClose, onApply, onShowFilters }: Props) {
  const [mounted, setMounted] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const { t } = useTranslation("translation");

  // чтобы не рендерить до монтирования
  useEffect(() => {
    setMounted(true);
  }, []);

  // блокируем прокрутку фона
  useEffect(() => {
    if (show) {
      document.body.classList.add('no-overlays');
    } else {
      document.body.classList.remove('no-overlays');
    }
    return () => document.body.classList.remove('no-overlays');
  }, [show]);

  const toggleItem = (value: string, list: string[], setter: (v: string[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter(i => i !== value));
    } else {
      setter([...list, value]);
    }
  };

  if (!mounted || !show) return null;

  return createPortal(
    <div className="fixed inset-0 z-[12000] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[11999]" />

      <div className="relative w-[92vw] sm:w-[85vw] md:w-[600px] bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 md:p-8 text-gray-800 z-[12001] max-h-[90vh] overflow-y-auto animate-[fadeInScale_0.4s_ease-out_forwards]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('filterIntro.title')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('filterIntro.subtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 🎯 Аудитория */}
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-800 mb-1">
            {t('filterIntro.audience')}
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm mb-3">
            {formatOptions.map((format) => {
              const isSelected = selectedFormats.includes(format);
              return (
                <button
                  key={format}
                  type="button"
                  onClick={() => toggleItem(format, selectedFormats, setSelectedFormats)}
                  className={`px-3 py-1 font-medium rounded-full border transition
                    ${isSelected ? 'bg-green-200 text-black' : 'bg-white text-black'}
                    hover:bg-green-100 active:scale-95`}
                >
                  {t(`format.${format}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 🎨 Типы событий */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-800 mb-1">
            {t('filterIntro.type')}
          </p>
          <div className="flex flex-wrap gap-2">
            {typeOptions.map(type => {
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleItem(type, selectedTypes, setSelectedTypes)}
                  className={`px-3 py-1 rounded-full border text-sm transition
                    ${isSelected ? 'bg-green-200 text-black' : 'bg-white text-black'}
                    hover:bg-green-100 active:scale-95`}
                >
                  {t(typeTranslationKeys[type] || type)}
                </button>
              );
            })}
          </div>
        </div>

        {/* ⚙️ Кнопки действий */}
        <div className="mt-8 space-y-3">
          <div className="flex justify-center">
            <button
              onClick={() => {
                onApply({ format: selectedFormats, type: selectedTypes });
                onClose();
              }}
              className="px-4 py-2 rounded-full border border-green-600 bg-green-200 text-gray-800 font-medium text-sm hover:bg-green-50 active:scale-[.98] transition"
            >
              {t('filterIntro.apply')}
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('openMainFilters', {
                    detail: { preselected: { format: selectedFormats, type: selectedTypes } },
                  })
                );
                onShowFilters?.();
                onClose();
              }}
              className="px-4 py-2 rounded-full border border-green-600 bg-green-200 text-gray-800 font-medium text-sm hover:bg-green-50 active:scale-[.98] transition"
            >
              {t('filterIntro.more')}
            </button>
          </div>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-gray-400 text-sm text-gray-800 hover:bg-gray-50 active:scale-[.98] transition"
            >
              {t('filterIntro.skip')}
            </button>
          </div>
        </div>
      </div>

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
