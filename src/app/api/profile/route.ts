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
import { parseSocialLinks } from '@/lib/social';
import {
  INTERESTS,
  KNOWLEDGE_LEVELS,
  REMINDER_LEADS,
  STUDY_TIMES,
  normalizePhone,
} from '@/lib/profileFields';
import { getServerProfile } from '@/lib/supabase/serverProfile';

function randomClassCode(): string {
  // Без похожих символов (0/O, 1/I) — код читают и вводят руками с доски.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

/**
 * Ошибка вставки профиля → устойчивый код вместо текста Postgres.
 *
 * RLS на profiles разрешает создать профиль только с почтой из
 * allowed_school_domains. Пока это правило срабатывало, наружу улетал
 * дословный текст базы — «new row violates row-level security policy for
 * table "profiles"» — и человек видел его прямо на экране регистрации.
 * Догадаться по нему, что дело в домене почты, а не в поломке сайта,
 * невозможно: в проде на этом уже застрял живой пользователь с адресом
 * школьного домена, которого нет в списке.
 *
 * Возвращаем код и сам список доменов: интерфейсу нужно назвать человеку
 * подходящие адреса, а держать этот список второй копией в клиенте —
 * значит гарантированно разойтись с базой при первом же изменении.
 */
async function describeInsertError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  error: { code?: string; message: string },
): Promise<{ error: string; domains?: string[] }> {
  // 42501 — insufficient_privilege, то есть отказ именно политики RLS.
  if (error.code !== '42501') return { error: error.message };

  const { data } = await supabase.from('allowed_school_domains').select('domain');
  return {
    error: 'domain_not_allowed',
    domains: (data ?? []).map((row) => row.domain as string),
  };
}

export async function GET() {
  // Та же функция, что вызывает layout при серверном рендере — иначе две
  // копии логики разошлись бы при первом же изменении схемы профиля.
  const { profile, email, emailConfirmed, schoolClass } = await getServerProfile();
  return NextResponse.json({ profile, email, emailConfirmed, class: schoolClass });
}

/**
 * Донаполнение профиля данными онбординга (класс, предметы, цель, дата).
 *
 * Отдельно от POST: POST создаёт профиль и выбирает роль один раз при
 * регистрации, PATCH правит поля персонализации сколько угодно раз потом.
 * Роль и класс через PATCH не проходят — их менять пользователю нельзя,
 * это дополнительно закрыто грантами на уровне колонок в самой базе.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.grade === 'number') patch.grade = body.grade;
  if (Array.isArray(body.subjectIds)) patch.subject_ids = body.subjectIds;
  if (typeof body.goal === 'string') patch.goal = body.goal;
  if (typeof body.targetDate === 'string' || body.targetDate === null) patch.target_date = body.targetDate;
  /*
    Подпись к сроку пишет сам ученик, поэтому обрезаем длину и превращаем
    пустую строку в null: «срок без названия» — это отсутствие подписи, а
    не подпись из пробелов.
  */
  if (typeof body.targetLabel === 'string' || body.targetLabel === null) {
    patch.target_label =
      typeof body.targetLabel === 'string' ? body.targetLabel.trim().slice(0, 120) || null : null;
  }
  if (typeof body.avatarColor === 'string') patch.avatar_color = body.avatarColor;
  if (typeof body.avatarPhotoPath === 'string' || body.avatarPhotoPath === null) patch.avatar_photo_path = body.avatarPhotoPath;
  if (typeof body.avatar_photo_path === 'string' || body.avatar_photo_path === null) patch.avatar_photo_path = body.avatar_photo_path;
  /*
    Ссылки чистим на сервере повторно, а не доверяем клиенту.
    Форма уже проверяет адрес, но PATCH — обычный HTTP-запрос: его можно
    отправить в обход интерфейса и положить в профиль javascript:-ссылку,
    которая сработает у того, кто откроет этот профиль.
  */
  if (Array.isArray(body.socialLinks)) patch.social_links = parseSocialLinks(body.socialLinks);

  /*
    Дальше — поля, добавленные вместе с контактами и приватностью.

    Каждое проверяется по своему справочнику, а не принимается как есть.
    PATCH — обычный HTTP-запрос, и «выбор из списка» существует только в
    форме: в обход неё сюда можно прислать любую строку, любой массив и
    любое число, и всё это осталось бы в базе и разъехалось по интерфейсу.
  */
  if (typeof body.phone === 'string' || body.phone === null) {
    const phone = body.phone === null ? null : normalizePhone(body.phone);
    // Пустая строка — это «стереть номер», а мусор — повод отказать целиком,
    // иначе человек увидит «сохранено» там, где ничего не сохранилось.
    if (body.phone !== null && body.phone.trim() !== '' && phone === null) {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
    }
    patch.phone = phone;
  }

  if (body.knowledgeLevel === null) patch.knowledge_level = null;
  else if (
    typeof body.knowledgeLevel === 'string' &&
    KNOWLEDGE_LEVELS.some((item) => item.id === body.knowledgeLevel)
  ) {
    patch.knowledge_level = body.knowledgeLevel;
  }

  if (Array.isArray(body.interests)) {
    // Лишнее отбрасываем молча, но дубли убираем: массив уходит в базу как есть.
    patch.interests = [...new Set(body.interests)].filter((id) =>
      INTERESTS.some((item) => item.id === id),
    );
  }

  if (typeof body.bio === 'string') patch.bio = body.bio.trim().slice(0, 800) || null;
  if (typeof body.availability === 'string') patch.availability = body.availability.trim().slice(0, 400) || null;

  for (const [key, column] of [
    ['leaderboardAnonymous', 'leaderboard_anonymous'],
    ['profileVisible', 'profile_visible'],
    ['progressVisible', 'progress_visible'],
    ['notifyLearning', 'notify_learning'],
    ['notifyOrg', 'notify_org'],
    ['notifyMarketing', 'notify_marketing'],
  ] as const) {
    if (typeof body[key] === 'boolean') patch[column] = body[key];
  }

  if (Array.isArray(body.studyDays)) {
    patch.study_days = [...new Set(body.studyDays)].filter(
      (day) => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6,
    );
  }

  if (body.studyTime === null) patch.study_time = null;
  else if (typeof body.studyTime === 'string' && STUDY_TIMES.some((item) => item.id === body.studyTime)) {
    patch.study_time = body.studyTime;
  }

  if (body.reminderLead === null) patch.reminder_lead_minutes = null;
  else if (typeof body.reminderLead === 'number' && REMINDER_LEADS.includes(body.reminderLead as 15)) {
    patch.reminder_lead_minutes = body.reminderLead;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ profile: data });
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
    if (profileError) {
      return NextResponse.json(await describeInsertError(supabase, profileError), { status: 403 });
    }

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

  if (error) return NextResponse.json(await describeInsertError(supabase, error), { status: 403 });
  return NextResponse.json({ profile: data, class: { name: cls.name, code: cls.code } });
}
