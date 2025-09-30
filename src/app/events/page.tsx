import { createClient } from '@supabase/supabase-js';

export const revalidate = 300; // обновлять HTML раз в 5 мин

type SP = { q?: string; page?: string; size?: string };

// (необязательно, но красиво: разный title в зависимости от запроса)
export function generateMetadata({ searchParams }: { searchParams: SP }) {
  const q = (searchParams.q ?? '').trim();
  const title = q
    ? `Events matching “${q}” — The Event Map`
    : 'Upcoming events in Switzerland — The Event Map';
  return {
    title,
    alternates: { canonical: q ? `/events?q=${encodeURIComponent(q)}` : '/events' },
  };
}

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  // 1) читаем q и чуть-чуть «чистим»
  const qRaw = (searchParams.q ?? '').trim().slice(0, 80); // ограничим длину
  const q = qRaw.replace(/[,%]/g, ' '); // уберём проблемные символы для .or()

  // 2) пагинация
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const size = Math.min(200, Math.max(10, Number(searchParams.size ?? 50))); // 10..200
  const from = (page - 1) * size;
  const to = from + size - 1;

  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const today = new Date().toISOString().slice(0, 10);

  // 3) базовый запрос
  let query = s
    .from('events')
    .select('id,title,start_date,start_time,address', { count: 'exact' })
    .gte('start_date', today);

  // 4) если есть q — добавляем поиск по нескольким полям
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      [
        `title.ilike.${like}`,
        `description.ilike.${like}`,
        `address.ilike.${like}`,
        `website.ilike.${like}`,
      ].join(',')
    );
  }

  // ВАЖНО: стабильная сортировка для корректной пагинации
  query = query.order('start_date', { ascending: true }).order('id', { ascending: true }).range(from, to);

  const { data: events, count } = await query;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));

  // 5) хелпер для ссылок: сохраняем q и size
  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    sp.set('page', String(p));
    sp.set('size', String(size));
    if (q) sp.set('q', q);
    return `/events?${sp.toString()}`;
  }

  return (
    <main className="prose mx-auto p-6">
      <h1>Upcoming events</h1>

      {/* 6) форма поиска (метод GET), поле называется q — как в JSON-LD */}
      <form method="GET" action="/events" className="mb-4">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by title, description, address…"
          className="border px-3 py-2 rounded w-full max-w-xl"
        />
        {/* сохраняем размер страницы при новом поиске */}
        <input type="hidden" name="size" value={size} />
        <div className="mt-2 flex gap-3">
          <button className="px-4 py-2 rounded bg-gray-200" type="submit">Search</button>
          {q && (
            <a className="underline text-sm text-gray-600" href="/events">Clear</a>
          )}
        </div>
      </form>

      <p>
        {q ? <>Query: <strong>“{q}”</strong> · </> : null}
        Total: {total} · Page {page} of {totalPages}
      </p>

      {(!events || events.length === 0) && (
        <p className="text-gray-600">No events found. Try another query.</p>
      )}

      <ul>
        {(events ?? []).map((ev) => (
          <li key={ev.id}>
            <a href={`/e/${ev.id}`}>{ev.title}</a>
            <br />
            <small>
              {ev.start_date} {ev.start_time?.slice(0, 5)} — {ev.address}
            </small>
          </li>
        ))}
      </ul>

      <nav className="flex gap-2 mt-4">
        <a
          aria-disabled={page <= 1}
          className="underline disabled:opacity-50"
          href={page > 1 ? pageUrl(page - 1) : '#'}
        >
          ← Prev
        </a>
        <a
          aria-disabled={page >= totalPages}
          className="underline disabled:opacity-50"
          href={page < totalPages ? pageUrl(page + 1) : '#'}
        >
          Next →
        </a>
      </nav>
    </main>
  );
}
