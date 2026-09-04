/**
 * Темы, составленные учителем.
 *
 * GET — отдаёт темы школы, чтобы они попали в план ученика наравне с
 * готовым контентом.
 *
 * POST — принимает черновик темы и проверяет каждое задание теми же
 * правилами, что и форма (lib/taskValidation). Проверка на сервере не
 * дублирование: форму можно обойти запросом напрямую, и тогда в базу
 * ляжет задание, на котором ученик застрянет, — например с ответом
 * «x = 4» там, где сравнение идёт по числу.
 */

import { NextResponse } from 'next/server';
import { getSubject } from '@/data';
import { createClient } from '@/lib/supabase/server';
import { draftToTask, validateTask, type TaskDraft } from '@/lib/taskValidation';
import type { Difficulty, Grade, Topic } from '@/lib/types';

const MAX_TASKS = 20;

interface TopicBody {
  subjectId?: unknown;
  title?: unknown;
  summary?: unknown;
  grades?: unknown;
  difficulty?: unknown;
  estimatedMinutes?: unknown;
  tasks?: unknown;
}

/** Строка из базы → тема в том же виде, что и готовый контент. */
function rowToTopic(row: Record<string, unknown>): Topic {
  return {
    id: String(row.id),
    subjectId: String(row.subject_id),
    title: String(row.title),
    summary: String(row.summary),
    grades: (row.grades as Grade[]) ?? [],
    difficulty: Number(row.difficulty) as Difficulty,
    skills: (row.skills as string[]) ?? [],
    prerequisites: [],
    estimatedMinutes: Number(row.estimated_minutes),
    material: (row.material as Topic['material']) ?? {
      intro: String(row.summary),
      sections: [],
      keyPoints: [],
      examples: [],
    },
    tasks: (row.tasks as Topic['tasks']) ?? [],
    custom: true,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ topics: [] });

  const { data } = await supabase
    .from('custom_topics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return NextResponse.json({ topics: (data ?? []).map((row) => rowToTopic(row)) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Темы создаёт учитель или администратор' }, { status: 403 });
  }

  let body: TopicBody;
  try {
    body = (await request.json()) as TopicBody;
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const subject = typeof body.subjectId === 'string' ? getSubject(body.subjectId) : undefined;
  if (!subject) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  if (title.length < 3 || summary.length < 10) {
    return NextResponse.json({ error: 'Заполните название и описание темы' }, { status: 400 });
  }

  const drafts = Array.isArray(body.tasks) ? (body.tasks as TaskDraft[]).slice(0, MAX_TASKS) : [];
  if (drafts.length === 0) {
    return NextResponse.json({ error: 'Нужно хотя бы одно задание' }, { status: 400 });
  }

  /*
    Навык обязан принадлежать предмету. Иначе прогресс засчитается в
    навык другого предмета, и движок построит план по данным, которых
    ученик не создавал.
  */
  const known = new Set(subject.skills.map((skill) => skill.id));
  const problems: { task: number; codes: string[] }[] = [];

  drafts.forEach((draft, index) => {
    const codes = validateTask(draft).map((problem) => problem.code);
    if (!known.has(draft.skillId)) codes.push('skill-missing');
    if (codes.length > 0) problems.push({ task: index, codes });
  });

  if (problems.length > 0) {
    return NextResponse.json({ error: 'Задания не прошли проверку', problems }, { status: 400 });
  }

  const topicId = `custom.${subject.id}.${Date.now().toString(36)}`;
  const tasks = drafts.map((draft, index) => draftToTask(draft, topicId, index));
  const difficulty = Math.min(5, Math.max(1, Number(body.difficulty) || 3));
  const grades = Array.isArray(body.grades)
    ? (body.grades as unknown[]).map(Number).filter((g) => g >= 7 && g <= 12)
    : [];

  const { error } = await supabase.from('custom_topics').insert({
    id: topicId,
    author_id: user.id,
    subject_id: subject.id,
    title,
    summary,
    grades,
    difficulty,
    // Навыки темы выводим из заданий: держать их отдельным списком значит
    // завести второй источник правды, который разойдётся с первым.
    skills: [...new Set(tasks.map((task) => task.skillId))],
    estimated_minutes: Math.min(180, Math.max(5, Number(body.estimatedMinutes) || 20)),
    material: { intro: summary, sections: [], keyPoints: [summary], examples: [] },
    tasks,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ topicId, tasks: tasks.length });
}
