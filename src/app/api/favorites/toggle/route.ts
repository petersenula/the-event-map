import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: 'Not authorized' }, { status: 401 });
  }

  const { eventId } = await req.json();
  const id = String(eventId);

  // читаем текущий список
  const { data: profile } = await supabase
    .from('profiles')
    .select('favorites')
    .eq('id', user.id)
    .maybeSingle();

  const curr: string[] = Array.isArray(profile?.favorites) ? profile!.favorites : [];

  const next = curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id];

  const { error: upErr, data: updated } = await supabase
    .from('profiles')
    .upsert({ id: user.id, favorites: next }, { onConflict: 'id' })
    .select('favorites')
    .single();

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, favorites: updated?.favorites ?? next });
}
