'use client';

import '@/lib/i18n';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import i18nGlobal from '@/lib/i18n';

export default function PrivacyPage() {
  const { t, i18n: i18nCtx } = useTranslation('privacy');

    useEffect(() => {
    // на всякий снимаем всё, что могло запретить прокрутку на странице карты
    document.body.classList.remove('no-page-scroll');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    }, []);

    // 1) ждём «гидратации» и выставляем язык до первой отрисовки контента
    const [readyToRender, setReadyToRender] = useState(false);

    useEffect(() => {
        const saved =
        typeof window !== 'undefined' ? localStorage.getItem('lang') : null;

        // если есть сохранённый — переключаем глобальный i18n,
        // иначе просто отмечаем готовность
        const apply = async () => {
        try {
            if (saved && saved !== i18nCtx.language) {
            await i18nGlobal.changeLanguage(saved);
            }
        } finally {
            setReadyToRender(true);
        }
        };
        apply();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2) пока язык «устаканивается» — ничего не рендерим (или можно показать скелетон)
    if (!readyToRender) {
        return (
        <main className="max-w-3xl mx-auto px-4 py-8">
            <div className="text-sm text-gray-600">Loading…</div>
        </main>
        );
    }

    // 3) теперь можно безопасно рисовать контент
    const raw = t('content', { returnObjects: true }) as unknown;
    const paragraphs: string[] = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
        ? [raw]
    : [];

    return (
        <div
            className="fixed inset-0 overflow-auto bg-white"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            <main className="max-w-3xl mx-auto px-4 py-8 relative z-10">
                <div className="mb-4 flex gap-2 items-center">
                    <span>🌐</span>
                    <select
                    value={i18nCtx.language}
                    onChange={(e) => {
                        const lang = e.target.value;
                        i18nGlobal.changeLanguage(lang);
                        localStorage.setItem('lang', lang);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                    >
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                    <option value="it">Italiano</option>
                    <option value="ru">Русский</option>
                    </select>

                    <Link href="/" className="ml-auto underline">
                    ← Back to map
                    </Link>
                </div>

                <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

                {paragraphs.map((p, i) => (
                    <p key={i} className="mb-4 whitespace-pre-wrap">
                    {p}
                    </p>
                ))}
            </main>
        </div>
    );
}
