import { createClient } from '@supabase/supabase-js';

export const revalidate = 300; // обновление HTML раз в 5 мин

type SP = { page?: string; size?: string };

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const page  = Math.max(1, Number(searchParams.page ?? 1));
  const size  = Math.min(200, Math.max(10, Number(searchParams.size ?? 50))); // 10..200
  const from  = (page - 1) * size;
  const to    = from + size - 1;

  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const today = new Date().toISOString().slice(0,10);

  // ВАЖНО: стабильный порядок: сначала по дате, потом по id — чтобы пагинация не "прыгала".
  const { data: events, count } = await s
    .from('events')
    .select('id,title,start_date,start_time,address', { count: 'exact' })
    .gte('start_date', today)
    .order('start_date', { ascending: true })
    .order('id', { ascending: true })
    .range(from, to);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <main className="prose mx-auto p-6">
      <h1>Upcoming events</h1>

      <p>Всего: {total} · Страница {page} из {totalPages}</p>

      <ul>
        {(events ?? []).map(ev => (
          <li key={ev.id}>
            <a href={`/e/${ev.id}`}>{ev.title}</a><br/>
            <small>{ev.start_date} {ev.start_time?.slice(0,5)} — {ev.address}</small>
          </li>
        ))}
      </ul>

      <nav className="flex gap-2">
        <a aria-disabled={page<=1} className="underline disabled:opacity-50"
           href={`/events?page=${page-1}&size=${size}`}>← Prev</a>
        <a aria-disabled={page>=totalPages} className="underline disabled:opacity-50"
           href={`/events?page=${page+1}&size=${size}`}>Next →</a>
      </nav>
    </main>
  );
}
