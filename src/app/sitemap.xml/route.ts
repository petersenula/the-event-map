// src/app/sitemap.xml/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 3600; // обновлять раз в час

export async function GET() {
  const base = 'https://ch.the-event-map.com';
  const urls: string[] = [
    `<url><loc>${base}/</loc><priority>1.0</priority></url>`,
    `<url><loc>${base}/events</loc><priority>0.8</priority></url>`,
    // когда сделаешь страницы /events/today и /events/weekend — добавь их сюда
    // `<url><loc>${base}/events/today</loc><priority>0.8</priority></url>`,
    // `<url><loc>${base}/events/weekend</loc><priority>0.8</priority></url>`,
  ];

  try {
    const s = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // берём события с запасом назад (например, 14 дней) + все будущие
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 14);
    const gteDate = fromDate.toISOString().slice(0, 10);

    const pageSize = 1000;
    let from = 0;

    for (;;) {
      const { data, error } = await s
        .from('events')
        .select('id, created_at, start_date, updated_at')
        .gte('start_date', gteDate)
        // стабильная сортировка для корректной пагинации:
        .order('start_date', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error || !data || data.length === 0) break;

      for (const e of data) {
        const lastmod = new Date(
          (e as any).updated_at ?? e.created_at ?? e.start_date ?? Date.now()
        ).toISOString();

        urls.push(
          `<url><loc>${base}/e/${e.id}</loc><lastmod>${lastmod}</lastmod><priority>0.7</priority></url>`
        );
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }
  } catch {
    // если БД недоступна — отдадим базовый sitemap; Гугл сможет его прочитать
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // помоги краулеру и кэшу
      'Cache-Control': 'max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
