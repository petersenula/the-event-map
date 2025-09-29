import { createClient } from '@supabase/supabase-js';

export const revalidate = 600;
export const metadata = { title: 'All upcoming events · The Event Map' };

export default async function EventsPage() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const today = new Date().toISOString().slice(0,10);
  const { data: events } = await s
    .from('events')
    .select('id,title,start_date,start_time,address')
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .limit(200);

  return (
    <main className="prose mx-auto p-6">
      <h1>Upcoming events in Switzerland</h1>
      <p>Смотри ближайшие события: дата, место и подробности.</p>
      <ul>
        {(events ?? []).map(ev => (
          <li key={ev.id}>
            <a href={`/e/${ev.id}`}>{ev.title}</a><br/>
            <small>{ev.start_date} {ev.start_time?.slice(0,5)} — {ev.address}</small>
          </li>
        ))}
      </ul>
    </main>
  );
}
