import type { Metadata, Viewport } from 'next';
import './globals.css';
import I18nProvider from '../components/i18nProvider';
import ClientWrapper from '../components/ClientWrapper';

import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import 'react-datepicker/dist/react-datepicker.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://ch.the-event-map.com'),
  title:
    'The Event Map – Events in Switzerland | Veranstaltungen in der Schweiz | Événements en Suisse | Eventi in Svizzera | События в Швейцарии',
  description:
    'Interactive map of the most exciting events in Switzerland: festivals, concerts, fairs, exhibitions, workshops, masterclasses, quests, , sport, recreation rooms, entertainments, entertainment centers, Chilbi. Interaktive Karte der spannendsten Events der Schweiz: Festivals, Konzerte, Messen, Ausstellungen, Workshops, Aufenthaltsräume, Unterhaltungen, Unterhaltungszentren, Chilbi.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'The Event Map – Switzerland',
    description:
      'Events, Festivals, Concerts, Exhibitions, Workshops, Masterclasses, Quests, Sport, Fairs, Recreation Rooms, Entertainments, Entertainment centers, Chilbi — Switzerland.',
    url: '/',
    siteName: 'The Event Map',
    images: [{ url: '/preview.png', width: 1200, height: 630, alt: 'The Event Map – Switzerland' }],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Event Map – Switzerland',
    description: 'Interactive map of events in Switzerland.',
    images: ['/preview.png'],
  },
};
export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2f2f2f" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          type="application/ld+json"
          // ВАЖНО: ничего не менять внутри dangerouslySetInnerHTML — так и должно быть
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "The Event Map",
              "url": "https://ch.the-event-map.com",
              // сообщаем Гуглу, как устроен внутренний поиск на сайте
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://ch.the-event-map.com/events?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body>
        <I18nProvider>         
            <ClientWrapper>
              {children}
            </ClientWrapper>       
        </I18nProvider>
      </body>
    </html>
  );
}

