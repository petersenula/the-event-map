// src/app/sitemap.xml/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';     // важно: не Edge, чтобы supabase работал стабильно
export const revalidate = 3600;      // обновлять раз в час

export async function GET() {
  const base = 'https://ch.the-event-map.com';

  // базовые страницы — всегда есть
  const urls: string[] = [
    `<url><loc>${base}/</loc><priority>1.0</priority></url>`,
    `<url><loc>${base}/events</loc><priority>0.8</priority></url>`,
  ];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('events')
      .select('id, created_at, start_date')     // этих полей достаточно
      .gte('start_date', today)                 // только будущие/текущие
      .order('start_date', { ascending: true })
      .limit(5000);

    if (data) {
      for (const e of data) {
        const lastmod = new Date(
          // если потом добавишь updated_at — подставится он
          (e as any).updated_at ?? e.created_at ?? e.start_date ?? Date.now()
        ).toISOString();

        urls.push(
          `<url><loc>${base}/e/${e.id}</loc><lastmod>${lastmod}</lastmod><priority>0.7</priority></url>`
        );
      }
    }
  } catch (err) {
    // молча даём базовый sitemap без событий — этого хватает, чтобы GSC не падал на "Couldn't fetch"
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
