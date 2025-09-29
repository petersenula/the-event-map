// src/app/auth/layout.tsx
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export const metadata = {
  title: "The Event Map – Events in Switzerland | Veranstaltungen in der Schweiz | Événements en Suisse | Eventi in Svizzera | События в Швейцарии",
  description:
    "Interactive map of the most exciting events in Switzerland: festivals, concerts, fairs, exhibitions. Interaktive Karte der spannendsten Veranstaltungen in der Schweiz: Festivals, Konzerte, Märkte, Ausstellungen. Carte interactive des événements les plus intéressants en Suisse : festivals, concerts, foires, expositions. Mappa interattiva degli eventi più interessanti in Svizzera: festival, concerti, fiere, mostre. Интерактивная карта самых интересных событий в Швейцарии: фестивали, концерты, ярмарки, выставки.",
  openGraph: {
    title: "The Event Map – Switzerland",
    description:
      "Events, Festivals, Concerts, Exhibitions – Switzerland. Veranstaltungen, Festivals, Konzerte, Ausstellungen – Schweiz. Événements, festivals, concerts, expositions – Suisse. Eventi, festival, concerti, mostre – Svizzera. События, фестивали, концерты, выставки – Швейцария.",
    url: "https://ch.the-event-map.com",
    siteName: "The Event Map",
    images: [
      {
        url: "https://ch.the-event-map.com/preview.png",
        width: 1200,
        height: 630,
        alt: "The Event Map – Switzerland",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  alternates: {
    canonical: "https://ch.the-event-map.com",
  },
};

