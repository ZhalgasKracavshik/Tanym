/**
 * Запись проверенных сервером попыток.
 *
 * Зачем это существует. Весь продукт держится на одном утверждении: мы
 * честно считаем, что ученик умеет, а что нет. При этом прогресс до сих
 * пор писал браузер — открыть инструменты разработчика и объявить себя
 * освоившим тему мог кто угодно. Для платформы, чья единственная идея в
 * честном измерении, это обесценивает саму идею.
 *
 * Правильность ответа сервер уже определяет сам (роут разбора сверяет
 * ответ через checkAnswer). Не хватало одного — сохранить этот вердикт.
 *
 * Почему нужен отдельный ключ. Роут ходит в базу под сессией самого
 * ученика, то есть с теми же правами, что и его браузер. Значит любое
 * разрешение на запись, которого хватает роуту, хватает и подделке из
 * консоли — с точки зрения Postgres это один и тот же клиент. Отличить
 * их можно только тем, чего у браузера нет: сервисным ключом. Поэтому
 * запись идёт мимо RLS под ним, а политика на таблице не даёт вставлять
 * строки вообще никому другому.
 *
 * Ключа может не быть (локальная копия без секретов, превью-сборка). Тогда
 * функция молча не пишет: разбор ответа ученику важнее, чем статистика, и
 * ронять из-за неё ответ нельзя.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Task } from '@/lib/types';

let cached: SupabaseClient | null = null;

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  if (!cached) {
    cached = createClient(url, key, {
      // Сервисный клиент не должен ни хранить, ни обновлять чью-либо
      // сессию: он живёт один на процесс и обслуживает разных учеников.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

interface RecordArgs {
  studentId: string;
  task: Pick<Task, 'id' | 'topicId' | 'skillId' | 'difficulty'>;
  subjectId: string | null;
  correct: boolean;
}

export async function recordTaskAttempt({ studentId, task, subjectId, correct }: RecordArgs): Promise<void> {
  const supabase = adminClient();
  if (!supabase) return;

  const { error } = await supabase.from('task_attempts').insert({
    student_id: studentId,
    task_id: task.id,
    topic_id: task.topicId,
    subject_id: subjectId,
    skill_id: task.skillId,
    /* Сложность приходит из реестра заданий, но у темы учителя её задаёт
       автор темы, и туда может прийти что угодно. В базе стоит CHECK на
       1..5, а падать из-за него посреди разбора ответа незачем. */
    difficulty: Math.min(5, Math.max(1, Math.round(task.difficulty ?? 1))),
    correct,
  });

  if (error) {
    // Не бросаем: ученик всё равно должен получить разбор своего ответа.
    console.error('Не удалось записать попытку', error.message);
  }
}
