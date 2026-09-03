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
import { CUSTOM_GOAL_MAX, GRADES, LEARNING_GOALS } from '@/lib/types';
import type { Grade } from '@/lib/types';
import { checkPersonName } from '@/lib/personName';
import { SUBJECTS } from '@/data';

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
  context: { role: string; email: string },
): Promise<{ error: string; domains?: string[] }> {
  // 42501 — insufficient_privilege, то есть отказ именно политики RLS.
  if (error.code !== '42501') return { error: error.message };

  const { data } = await supabase
    .from('allowed_school_domains')
    .select('domain, allows_teacher');
  const rows = (data ?? []) as { domain: string; allows_teacher: boolean }[];
  const address = context.email.toLowerCase();
  const matched = rows.find((row) => address.endsWith(`@${row.domain.toLowerCase()}`));

  /*
    Два разных отказа, и путать их нельзя. Домен может быть разрешён
    вообще, но закрыт для роли учителя — тогда сообщение «зарегистрируйтесь
    с почты на gmail.com» звучало бы издевательски: человек как раз с неё и
    пришёл. Разводим случаи по тому, нашёлся ли домен в списке.
  */
  if (matched && context.role === 'teacher' && !matched.allows_teacher) {
    return {
      error: 'teacher_domain_required',
      domains: rows.filter((row) => row.allows_teacher).map((row) => row.domain),
    };
  }

  return {
    error: 'domain_not_allowed',
    domains: rows.map((row) => row.domain),
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
  /*
    Имя проверяется и здесь, а не только на форме регистрации: PATCH можно
    вызвать напрямую, минуя интерфейс, а имя видно другим ученикам.
  */
  if (body.name !== undefined) {
    const checked = checkPersonName(body.name);
    if (!checked.ok) return NextResponse.json({ error: 'invalid_name', message: checked.reason }, { status: 400 });
    patch.name = checked.value;
  }

  /*
    Класс, предметы и цель проверяются по справочникам, а не принимаются
    на веру. Ниже по коду то же самое уже делается для интересов, уровня
    подготовки и расписания — эти три поля просто оставались исключением.
    PATCH — обычный HTTP-запрос: «выбор из списка» существует только в
    форме, а мимо неё сюда приходит что угодно. Класс 99 или цель
    «qwerty» сохранились бы в базу и разъехались бы по расчёту плана,
    который ищет тему по классу и цели.
  */
  if (typeof body.grade === 'number' && GRADES.includes(body.grade as Grade)) {
    patch.grade = body.grade;
  }

  if (Array.isArray(body.subjectIds)) {
    const known = new Set(SUBJECTS.map((subject) => subject.id));
    // Дубли убираем, неизвестные предметы отбрасываем молча: массив
    // уходит в базу как есть и потом используется как источник истины.
    patch.subject_ids = [...new Set(body.subjectIds)].filter(
      (id): id is string => typeof id === 'string' && known.has(id),
    );
  }

  if (typeof body.goal === 'string' && LEARNING_GOALS.some((item) => item.id === body.goal)) {
    patch.goal = body.goal;
    /*
      Своя формулировка хранится только вместе с целью 'custom'. Если
      ученик передумал и выбрал готовый вариант, старый текст стирается:
      иначе он остался бы в базе и продолжал уходить в промпт наставника,
      противореча выбранной цели.

      Обрезаем по той же длине, что стоит в CHECK базы, — иначе вставка
      просто упала бы ошибкой вместо понятного поведения.
    */
    if (body.goal === 'custom') {
      const own = typeof body.goalCustom === 'string' ? body.goalCustom.trim() : '';
      patch.goal_custom = own ? own.slice(0, CUSTOM_GOAL_MAX) : null;
    } else {
      patch.goal_custom = null;
    }
  }
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

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  /*
    Читаем профиль отдельным вызовом, а не через RETURNING.
    Телефон закрыт правом на колонку, поэтому select('*') на profiles
    больше не проходит даже у владельца: грант выдан роли, а не строке.
    Функция с правами владельца отдаёт свою строку целиком.
  */
  const { data: updated } = await supabase.rpc('get_own_profile').maybeSingle();
  return NextResponse.json({ profile: updated ?? null });
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
      return NextResponse.json(await describeInsertError(supabase, profileError, { role, email: user.email ?? "" }), { status: 403 });
    }

    /*
      Класс создаётся функцией в базе, а не двумя запросами отсюда.

      Раньше здесь был insert в classes, а следом обычный update
      profiles.class_id. Но UPDATE на profiles выдан поколоночно, и class_id
      в него намеренно не входит — иначе ученик переписал бы себе класс в
      обход кода. Этот update падал с 42501, его ошибку никто не проверял
      (данные деструктурировались без error), и роут отвечал 200 с
      profile: null. В итоге ни один учитель не был привязан к своему
      классу: панель не показывала ни кода для учеников, ни списка, а
      повторно зарегистрироваться было нельзя — профиль-то уже создан.

      Функция делает обе операции разом и под своими правами, а повторный
      вызов возвращает уже существующий класс вместо второго.
    */
    let classRow: { id: string; name: string; code: string } | null = null;
    let classError: { code?: string; message: string } | null = null;

    for (let attempt = 0; attempt < 5 && !classRow; attempt++) {
      const { data, error } = await supabase
        .rpc('create_own_class', { p_code: randomClassCode() })
        .single();
      if (!error) {
        classRow = data as { id: string; name: string; code: string };
        break;
      }
      classError = error;
      // unique_violation по коду — берём другой и пробуем ещё раз.
      if (error.code !== '23505') break;
    }

    if (!classRow) {
      return NextResponse.json(
        { error: classError?.code === '23505' ? 'class_code_collision' : (classError?.message ?? 'class_create_failed') },
        { status: 500 },
      );
    }

    // Профиль перечитываем после привязки, иначе вернём его без class_id.
    // Та же причина, что и выше: свою строку читаем функцией.
    const { data: finalProfile } = await supabase.rpc('get_own_profile').maybeSingle();

    return NextResponse.json({ profile: finalProfile, class: { name: classRow.name, code: classRow.code } });
  }

  /*
    Ученик: код класса необязателен.

    Раньше без кода профиль не создавался вовсе — «ученик, которого никто
    не мониторит». Но на практике это упирало в тупик тех, у кого кода
    сейчас нет: зарегистрироваться они не могли, а значит не могли и
    ничего другого. Теперь профиль создаётся без класса, а код спрашивают
    в онбординге, где от него можно отказаться и ввести позже
    (join_class_by_code).

    Неверный код по-прежнему ошибка, а не молчаливое «ну и ладно»: человек
    что-то ввёл, и он должен узнать, что это не сработало.
  */
  const classCode: string = (body?.classCode ?? '').trim().toUpperCase();

  let cls: { id: string; name: string; code: string } | null = null;
  if (classCode) {
    const { data } = await supabase
      .from('classes')
      .select('id, name, code')
      .eq('code', classCode)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: 'class_not_found' }, { status: 404 });
    cls = data;
  }

  const { error } = await supabase
    .from('profiles')
    .insert({ id: user.id, role, name, class_id: cls?.id ?? null });

  if (error) return NextResponse.json(await describeInsertError(supabase, error, { role, email: user.email ?? "" }), { status: 403 });

  // Созданную строку читаем функцией: RETURNING не проходит, потому что
  // телефон закрыт правом на колонку (см. get_own_profile).
  const { data: created } = await supabase.rpc('get_own_profile').maybeSingle();
  return NextResponse.json({
    profile: created ?? null,
    class: cls ? { name: cls.name, code: cls.code } : null,
  });
}
