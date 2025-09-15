'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

// какие языки и неймспейсы используем
export const supportedLngs = ['en', 'de', 'fr', 'it', 'ru'] as const;
export const namespaces = ['translation', 'privacy', 'addEvent', 'feedback'] as const;

// ИНИЦИАЛИЗАЦИЯ ОДИН РАЗ (важно для HMR/Next)
if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .use(
      resourcesToBackend((lng: string, ns: string, cb) => {
        // ПУТЬ К ПЕРЕВОДАМ: src/lib/i18n.ts -> ../locales/<lng>/<ns>.json
        import(`../locales/${lng}/${ns}.json`)
          .then((m) => cb(null, (m as any).default ?? m))
          .catch((err) => cb(err as Error, null));
      })
    )
    .init({
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: supportedLngs as unknown as string[],
      ns: namespaces as unknown as string[],
      defaultNS: 'translation',
      interpolation: { escapeValue: false },
      react: { useSuspense: false }, // удобнее для Next.js App Router
      returnEmptyString: false,
    });
}

export default i18n;

