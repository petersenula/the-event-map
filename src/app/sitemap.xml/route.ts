import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600; // обновлять раз в час

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: events } = await supabase
    .from('events')
    .select('id, created_at, start_date')
    .gte('start_date', today)                 // только будущие/текущие
    .order('start_date', { ascending: true })
    .limit(5000);                             // запас

  const base = 'https://ch.the-event-map.com';

  const urls = (events ?? []).map((e) => {
    const lastmod = new Date(
      (e as any).updated_at ?? e.created_at ?? e.start_date ?? Date.now()
    ).toISOString();
    return `
      <url>
        <loc>${base}/e/${e.id}</loc>
        <lastmod>${lastmod}</lastmod>
        <priority>0.7</priority>
      </url>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url><loc>${base}/</loc><priority>1.0</priority></url>
    <url><loc>${base}/events</loc><priority>0.8</priority></url>
    ${urls}
  </urlset>`;

  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } });
}
