/**
 * Диагностика: сохранение результата и выдача сохранённого.
 *
 * POST — браузер присылает только пары «задание, ответ». Правильность и
 * уровень считает СЕРВЕР по тому же реестру заданий: диагностика задаёт
 * стартовую сложность, то есть подделанная диагностика — это выданный
 * себе продвинутый план. Верить присланному флагу «верно» здесь нельзя
 * ровно по той же причине, по которой нельзя в разборе задания.
 *
 * GET — отдаёт сохранённые результаты по всем предметам. Нужен, чтобы
 * ученик, вошедший с другого устройства, увидел свой план, а не
 * приглашение пройти то, что он уже прошёл.
 */

import { NextResponse } from 'next/server';
import { getSubject, getTask } from '@/data';
import { checkAnswer } from '@/lib/grading';
import { scoreDiagnostic } from '@/lib/personalization';
import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { LIMITS, clampText } from '@/lib/ai/sanitize';
import type { Task } from '@/lib/types';

interface SubmittedAnswer {
  taskId: string;
  answer: string;
}

/** Ответов в диагностике не бывает больше пары десятков — предел от мусора. */
const MAX_ANSWERS = 40;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ diagnostics: {} });

  const { data } = await supabase
    .from('student_diagnostics')
    .select('subject_id, score, level, starting_difficulty, skill_mastery, answers, completed_at')
    .eq('student_id', user.id);

  return NextResponse.json({ diagnostics: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Нужен вход' }, { status: 401 });

  let body: { subjectId?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  const subject = typeof body.subjectId === 'string' ? getSubject(body.subjectId) : undefined;
  if (!subject) return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });

  if (!Array.isArray(body.answers) || body.answers.length === 0) {
    return NextResponse.json({ error: 'Нужны ответы' }, { status: 400 });
  }

  /*
    Задания берём из реестра по идентификатору, а не из тела запроса.
    Прислать вместе с ответом ещё и «правильный ответ» означало бы
    вернуть проверку обратно в браузер.
  */
  const graded: { task: Task; answer: string; correct: boolean }[] = [];
  for (const raw of (body.answers as SubmittedAnswer[]).slice(0, MAX_ANSWERS)) {
    if (typeof raw?.taskId !== 'string') continue;
    const task = getTask(raw.taskId);
    // Задание должно принадлежать диагностике именно этого предмета.
    if (!task || !subject.diagnostic.some((item) => item.id === task.id)) continue;
    const answer = clampText(typeof raw.answer === 'string' ? raw.answer : '', LIMITS.option);
    graded.push({ task, answer, correct: checkAnswer(task, answer) });
  }

  if (graded.length === 0) {
    return NextResponse.json({ error: 'Ни один ответ не относится к диагностике предмета' }, { status: 400 });
  }

  const scored = scoreDiagnostic(subject, graded);

  const admin = adminClient();
  if (admin) {
    const { error } = await admin.from('student_diagnostics').upsert(
      {
        student_id: user.id,
        subject_id: subject.id,
        score: scored.score,
        level: scored.level,
        starting_difficulty: scored.startingDifficulty,
        skill_mastery: scored.skillMastery,
        answers: graded.map((item) => ({
          taskId: item.task.id,
          skillId: item.task.skillId,
          difficulty: item.task.difficulty,
          correct: item.correct,
          answer: item.answer,
        })),
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,subject_id' },
    );
    // Не роняем ответ: ученик должен увидеть свой результат, даже если
    // сохранить его не удалось. Иначе семь минут работы пропадают молча.
    if (error) console.error('Не удалось сохранить диагностику', error.message);
  }

  return NextResponse.json({
    subjectId: subject.id,
    score: scored.score,
    level: scored.level,
    startingDifficulty: scored.startingDifficulty,
    skillMastery: scored.skillMastery,
    answers: graded.map((item) => ({
      taskId: item.task.id,
      skillId: item.task.skillId,
      difficulty: item.task.difficulty,
      correct: item.correct,
      answer: item.answer,
    })),
    completedAt: new Date().toISOString(),
  });
}
