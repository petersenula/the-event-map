import type { Metadata, Viewport } from 'next';
import '../globals.css';
import I18nProvider from '../components/I18nProvider';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import 'react-datepicker/dist/react-datepicker.css';
import ClientWrapper from '@/components/ClientWrapper';

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <I18nProvider>
          <ClientWrapper>{children}</ClientWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
