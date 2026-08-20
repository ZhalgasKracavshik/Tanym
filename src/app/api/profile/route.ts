/**
 * Создаёт запись профиля (роль ученика или учителя) после первого входа
 * через Google. До этого момента у пользователя есть сессия, но нет строки
 * в profiles, а значит и права публиковать — все политики публикации
 * ссылаются на неё.
 *
 * У роли есть побочный эффект с классом:
 *  - учитель получает новый класс с сгенерированным кодом (создаётся здесь,
 *    а не заранее — код должен принадлежать именно этому учителю);
 *  - ученик обязан указать код существующего класса, иначе профиль не
 *    создаётся — ученик без класса некому мониторить.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function randomClassCode(): string {
  // Без похожих символов (0/O, 1/I) — код читают и вводят руками с доски.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ profile: null }, { status: 200 });

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  let classInfo: { name: string; code: string } | null = null;
  if (profile?.class_id) {
    const { data: cls } = await supabase.from('classes').select('name, code').eq('id', profile.class_id).maybeSingle();
    classInfo = cls ?? null;
  }

  return NextResponse.json({ profile, email: user.email, class: classInfo });
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

  if (role === 'teacher') {
    // Профиль сначала без класса: политика на INSERT в classes проверяет,
    // что у auth.uid() уже есть строка profiles с role='teacher'.
    const { error: profileError } = await supabase.from('profiles').insert({ id: user.id, role, name });
    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 403 });

    let classRow = null;
    for (let attempt = 0; attempt < 5 && !classRow; attempt++) {
      const { data, error } = await supabase
        .from('classes')
        .insert({ teacher_id: user.id, code: randomClassCode() })
        .select()
        .single();
      if (!error) classRow = data;
      // unique_violation на code — берём другой код и пробуем ещё раз.
      else if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!classRow) return NextResponse.json({ error: 'class_code_collision' }, { status: 500 });

    const { data: finalProfile } = await supabase
      .from('profiles')
      .update({ class_id: classRow.id })
      .eq('id', user.id)
      .select()
      .single();

    return NextResponse.json({ profile: finalProfile, class: { name: classRow.name, code: classRow.code } });
  }

  // Ученик: код обязателен, без него профиль не создаётся вовсе — иначе
  // получился бы ученик, которого никто не мониторит.
  const classCode: string = (body?.classCode ?? '').trim().toUpperCase();
  if (!classCode) return NextResponse.json({ error: 'class_code_required' }, { status: 400 });

  const { data: cls } = await supabase.from('classes').select('id, name, code').eq('code', classCode).maybeSingle();
  if (!cls) return NextResponse.json({ error: 'class_not_found' }, { status: 404 });

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, role, name, class_id: cls.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ profile: data, class: { name: cls.name, code: cls.code } });
}
