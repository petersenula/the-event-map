'use client';

import type { Metadata, Viewport } from 'next';
import '@/globals.css';
import I18nProvider from '@/components/I18nProvider';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import 'react-datepicker/dist/react-datepicker.css';

import { useSessionReady } from '@/hooks/useSessionReady';
import FullScreenLoader from '@/components/FullScreenLoader';

export const metadata: Metadata = {
  title: 'DFF Event Map',
  description: 'Интерактивная карта мероприятий в Швейцарии',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ready = useSessionReady();

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>
          {!ready && <FullScreenLoader />}
          {ready && children}
        </I18nProvider>
      </body>
    </html>
  );
}
