import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';     // не кэшируем на билд
export const revalidate = 3600;             // можно оставить

export async function GET() {
  const base = 'https://ch.the-event-map.com';
  const urls: string[] = [
    `<url><loc>${base}/</loc><priority>1.0</priority></url>`,
    `<url><loc>${base}/events</loc><priority>0.8</priority></url>`,
  ];

  try {
    const s = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // окно дат: 90 дней назад + всё будущее (можешь поменять на 14 / 0)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 90);
    const gteDate = fromDate.toISOString().slice(0, 10);

    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await s
        .from('events')
        // ВАЖНО: убрали updated_at (этой колонки у тебя нет)
        .select('id, created_at, start_date')
        .gte('start_date', gteDate)
        .order('start_date', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('sitemap query error:', error);
        break;
      }
      if (!data || data.length === 0) break;

      for (const e of data) {
        const lastmod = new Date(
          // берём created_at или start_date — чего больше достаточно
          (e as any).created_at ?? (e as any).start_date ?? Date.now()
        ).toISOString();

        urls.push(
          `<url><loc>${base}/e/${(e as any).id}</loc><lastmod>${lastmod}</lastmod><priority>0.7</priority></url>`
        );
      }

      if (data.length < pageSize) break; // дошли до конца
    }
  } catch (err) {
    console.error('sitemap fatal error:', err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'max-age=0, s-maxage=300, must-revalidate, stale-while-revalidate=86400',
    },
  });
}
