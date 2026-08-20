/**
 * Создаёт запись профиля (роль ученика или учителя) после первого входа
 * через Google. До этого момента у пользователя есть сессия, но нет строки
 * в profiles, а значит и права публиковать — все политики публикации
 * ссылаются на неё.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ profile: null }, { status: 200 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return NextResponse.json({ profile, email: user.email });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (role !== 'student' && role !== 'teacher') {
    return NextResponse.json({ error: 'invalid_role' }, { status: 400 });
  }

  const name: string = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Без имени';

  // RLS сама откажет, если домен почты не в allowed_school_domains — здесь
  // просто пробрасываем ошибку базы наружу как есть.
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, role, name })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ profile: data });
}
