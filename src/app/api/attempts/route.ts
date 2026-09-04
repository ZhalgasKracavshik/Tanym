/**
 * GET /api/attempts — попытки ученика, проверенные сервером.
 *
 * Нужен затем же, зачем и выдача диагностики: прогресс жил только в
 * localStorage, и ученик, вошедший с другого устройства, видел «Пока нет
 * данных о прогрессе» — при том что на сервере его решённые задания
 * лежали и учитывались в школьном рейтинге. Один человек видел две
 * разные картины на соседних вкладках.
 *
 * Отдаём сырые попытки, а не готовый прогресс по темам: считает его
 * движок персонализации (applyAttemptToProgress), и заводить второе
 * место, где это же считается по-другому, — верный способ получить
 * расхождение.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/*
  Предел на выдачу. Ученику для восстановления прогресса нужна история, а
  не вся жизнь: движок считает владение навыком скользящим средним, и
  попытки годовой давности на результат почти не влияют.
*/
const LIMIT = 500;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ attempts: [] });

  const { data } = await supabase
    .from('task_attempts')
    .select('task_id, topic_id, subject_id, skill_id, difficulty, correct, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: true })
    .limit(LIMIT);

  return NextResponse.json({
    attempts: (data ?? []).map((row) => ({
      taskId: row.task_id,
      topicId: row.topic_id ?? '',
      subjectId: row.subject_id ?? '',
      skillId: row.skill_id ?? '',
      difficulty: row.difficulty,
      correct: row.correct,
      // Ответ ученика на сервере не хранится: для расчёта владения он не
      // нужен, а хранить лишнее про несовершеннолетних незачем.
      answer: '',
      at: row.created_at,
    })),
  });
}
