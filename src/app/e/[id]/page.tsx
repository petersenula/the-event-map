import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { id: string } }) {
  // Заголовок страницы в <title>
  return {
    title: `Event · ${params.id} · The Event Map`,
    alternates: { canonical: `/e/${params.id}` },
  };
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: ev } = await s
    .from('events')
    .select('id,title,description,address,lat,lng,start_date,start_time,end_date,end_time,website,paid,price')
    .eq('id', params.id)
    .single();

  if (!ev) return notFound();

  const start = `${ev.start_date}T${(ev.start_time || '00:00')}:00`;
  const end = ev.end_date ? `${ev.end_date}T${(ev.end_time || '23:59')}:00` : undefined;

  const translations = [
    { code: 'de', label: 'Deutsch', text: ev.description_de },
    { code: 'fr', label: 'Français', text: ev.description_fr },
    { code: 'it', label: 'Italiano', text: ev.description_it },
    { code: 'en', label: 'English', text: ev.description_en },
    { code: 'ru', label: 'Русский', text: ev.description_ru },
  ].filter(t => typeof t.text === 'string' && t.text.trim().length > 0);

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: ev.title,
    description: ev.description,
    startDate: start,
    endDate: end,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: ev.address,
      address: ev.address,
      geo: (ev.lat && ev.lng) ? { '@type': 'GeoCoordinates', latitude: ev.lat, longitude: ev.lng } : undefined,
    },
    url: `https://ch.the-event-map.com/e/${ev.id}`,
  };

  if (ev.paid && ev.price != null) {
    jsonLd.offers = {
      '@type': 'Offer',
      price: String(ev.price),
      priceCurrency: 'CHF', // при желании поставь свою валюту
      availability: 'https://schema.org/InStock'
    };
  }

  return (
    <main className="prose mx-auto p-6">
      <h1>{ev.title}</h1>
      <p><strong>Когда:</strong> {ev.start_date} {ev.start_time?.slice(0,5)}</p>
      {ev.end_date && <p><strong>До:</strong> {ev.end_date} {ev.end_time?.slice(0,5)}</p>}
      <p><strong>Где:</strong> {ev.address}</p>
      {ev.website && <p><a href={ev.website} rel="nofollow">Сайт события</a></p>}
      {ev.description && <p>{ev.description}</p>}
      {translations.length > 0 && (
        <section>
          <h2>Translations / Переводы</h2>
          {translations.map(t => (
            <details key={t.code} className="mb-2">
              <summary><strong>{t.label}</strong></summary>
              <p style={{ whiteSpace: 'pre-wrap' }}>{t.text}</p>
            </details>
          ))}
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
