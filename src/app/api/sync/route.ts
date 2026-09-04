/**
 * GET /api/sync — всё, что нужно восстановить при входе, одним запросом.
 *
 * Раньше это были три отдельных роута: попытки, диагностики и темы
 * учителей. Замер на проде показал, почему так нельзя: 5122, 4337 и 4083
 * миллисекунды, и все три уходили при открытии ЛЮБОЙ страницы, включая
 * профиль, которому они не нужны вовсе.
 *
 * Дело не в самих запросах к базе — они быстрые. Дело в том, что каждый
 * роут отдельно проверял пользователя через auth.getUser(), а это сетевой
 * поход в Supabase Auth, и на бесплатном тарифе к нему добавляется
 * холодный старт функции. Три роута — три таких похода подряд.
 *
 * Здесь пользователь проверяется один раз, а три запроса к базе уходят
 * параллельно и ждут только самого медленного.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Difficulty, Grade, Topic } from '@/lib/types';

/*
  Предел на историю попыток. Движок считает владение навыком скользящим
  средним, и попытки годовой давности на результат почти не влияют.
*/
const ATTEMPTS_LIMIT = 500;
const TOPICS_LIMIT = 200;

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

  if (!user) return NextResponse.json({ attempts: [], diagnostics: [], topics: [] });

  const [attempts, diagnostics, topics] = await Promise.all([
    supabase
      .from('task_attempts')
      .select('task_id, topic_id, subject_id, skill_id, difficulty, correct, created_at')
      .eq('student_id', user.id)
      .order('created_at', { ascending: true })
      .limit(ATTEMPTS_LIMIT),
    supabase
      .from('student_diagnostics')
      .select('subject_id, score, level, starting_difficulty, skill_mastery, answers, completed_at')
      .eq('student_id', user.id),
    supabase.from('custom_topics').select('*').order('created_at', { ascending: false }).limit(TOPICS_LIMIT),
  ]);

  return NextResponse.json({
    attempts: (attempts.data ?? []).map((row) => ({
      taskId: row.task_id,
      topicId: row.topic_id ?? '',
      subjectId: row.subject_id ?? '',
      skillId: row.skill_id ?? '',
      difficulty: row.difficulty,
      correct: row.correct,
      // Ответ ученика не хранится: для расчёта владения он не нужен, а
      // держать лишнее про несовершеннолетних незачем.
      answer: '',
      at: row.created_at,
    })),
    diagnostics: (diagnostics.data ?? []).map((row) => ({
      subjectId: row.subject_id,
      answers: row.answers ?? [],
      skillMastery: row.skill_mastery ?? {},
      score: row.score,
      level: row.level,
      startingDifficulty: row.starting_difficulty,
      completedAt: row.completed_at,
    })),
    topics: (topics.data ?? []).map((row) => rowToTopic(row)),
  });
}
