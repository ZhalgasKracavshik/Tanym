/**
 * POST /api/ai/feedback — проверка ответа ученика и, по запросу, разбор.
 *
 * Ключевое решение: правильность ответа определяет СЕРВЕР, а не клиент.
 * Клиент присылает только сам ответ; сервер находит задание в реестре и
 * сверяет сам. Иначе достаточно было бы подделать один флаг в запросе,
 * чтобы получить «верно» на что угодно.
 *
 * Второе решение: проверка и разбор разъединены. Сверка с эталоном занимает
 * миллисекунды, обращение к модели — секунды, и раньше они уходили одним
 * запросом: ученик ждал объяснение после каждого задания, даже когда хотел
 * лишь узнать «верно или нет». Теперь разбор приходит только по флагу
 * explain, а вердикт и запись попытки — всегда.
 */

import { NextResponse } from 'next/server';
import { getSubject, getTask, getTopic } from '@/data';
import { checkAnswer, correctAnswerText } from '@/lib/grading';
import { AiUnavailableError, generateText, isAiConfigured } from '@/lib/ai/gemini';
import { feedbackPrompt, feedbackSystem, type FeedbackInput } from '@/lib/ai/prompts';
import { feedbackFallback } from '@/lib/ai/fallback';
import { checkRateLimit, clientKeyFromRequest } from '@/lib/ai/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { recordTaskAttempt } from '@/lib/supabase/attempts';
import type { FeedbackRequest, FeedbackResponse } from '@/lib/ai/contracts';
import { LIMITS, clampNumber, clampText, clampTextList, sanitizeProfile } from '@/lib/ai/sanitize';

/** Обрезка полей задания, присланного браузером (тема учителя). */
function clampTask(task: FeedbackRequest['task']): FeedbackRequest['task'] {
  if (!task) return undefined;
  return {
    ...task,
    prompt: clampText(task.prompt, LIMITS.taskField),
    hint: clampText(task.hint, LIMITS.taskField),
    explanation: clampText(task.explanation, LIMITS.taskField),
    options: task.options ? clampTextList(task.options, LIMITS.options, LIMITS.option) : undefined,
    correctValue: task.correctValue === undefined ? undefined : clampText(task.correctValue, LIMITS.option),
  };
}

export async function POST(request: Request): Promise<NextResponse<FeedbackResponse | { error: string }>> {
  const limit = checkRateLimit(clientKeyFromRequest(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Слишком много запросов. Повторите через ${limit.retryAfterSeconds} с.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) } },
    );
  }

  let body: FeedbackRequest;
  try {
    body = (await request.json()) as FeedbackRequest;
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON в теле запроса' }, { status: 400 });
  }

  if (typeof body?.taskId !== 'string' || typeof body?.answer !== 'string') {
    return NextResponse.json({ error: 'Нужны поля taskId и answer' }, { status: 400 });
  }

  // Тему, созданную учителем, сервер не знает — она хранится в браузере,
  // поэтому для неё задание приходит в теле запроса.
  /*
    Задание из реестра доверенное, присланное браузером — нет.

    Второй путь существует ради тем, созданных учителем: они живут в
    localStorage, сервер о них не знает. Но текст такого задания уходит в
    промпт, поэтому длина полей ограничивается. Без этого одно поле
    «эталонного решения» могло принести в запрос сколько угодно текста.
  */
  const registryTask = getTask(body.taskId);
  const task = registryTask ?? (body.task ? clampTask(body.task) : undefined);
  if (!task) {
    return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
  }

  const topic = getTopic(body.topicId ?? task.topicId);
  const subject = getSubject(topic?.subjectId);
  const correct = checkAnswer(task, body.answer);

  /*
    Вердикт сохраняется здесь — в единственном месте, где он получен
    честно. Ученика берём из сессии, а не из тела запроса: иначе можно
    было бы записывать успехи на чужое имя.

    Ждать запись обязательно, а не отпускать промис: на Vercel функция
    засыпает сразу после ответа, и незавершённый insert потерялся бы.

    Пишем только на проверке, не на разборе. Разбор — это второй запрос по
    уже отвеченному заданию, и если бы он тоже писал попытку, каждое
    разобранное задание считалось бы дважды. Ответ ученика проходит через
    проверку всегда, поэтому одна попытка ровно один раз и записывается.

    Обратная сторона известна: отправив сразу explain, можно не дать
    записать свою неверную попытку. Баллы этим не поднять — их дают только
    за первое верное решение, — так что в худшем случае человек скрывает
    собственную ошибку от собственной статистики. Это несопоставимо
    меньшая беда, чем удвоение попыток у всех честных.
  */
  if (!body.explain) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await recordTaskAttempt({ studentId: user.id, task, subjectId: subject?.id ?? null, correct });
    }
  }

  const base = { correct, correctAnswer: correctAnswerText(task) };

  /*
    Быстрый выход: вердикт без разбора.

    Попытка к этому моменту уже записана, то есть честность прогресса от
    отказа от разбора не страдает. Модель здесь не вызывается вовсе —
    ответ уходит за миллисекунды вместо секунд, и ученик не ждёт объяснения,
    которого не просил. Заодно это единственный способ не жечь дневную
    квоту на заданиях, где ученик и так всё понял.
  */
  if (!body.explain) {
    return NextResponse.json({ ...base, explained: false });
  }

  const input: FeedbackInput = {
    task,
    // Если темы нет в реестре (контент учителя), подставляем минимальную заглушку:
    // модели достаточно текста задания и эталонного решения.
    topic: topic ?? {
      id: task.topicId,
      subjectId: subject?.id ?? '',
      title: 'Пользовательская тема',
      summary: '',
      grades: [],
      difficulty: task.difficulty,
      skills: [task.skillId],
      prerequisites: [],
      estimatedMinutes: 15,
      material: { intro: '', sections: [], keyPoints: [], examples: [] },
      tasks: [task],
    },
    subject: subject ?? {
      id: '',
      title: 'Предмет',
      shortTitle: '',
      description: '',
      icon: 'book',
      accent: 'var(--accent-blue)',
      grades: [],
      skills: [],
      topics: [],
      diagnostic: [],
    },
    answer: body.answer,
    correct,
    profile: sanitizeProfile(body.profile),
    /* Владение навыком идёт в промпт процентом. Раньше сюда проходило любое
       число, включая бесконечность и 1e308. */
    skillMastery: clampNumber(body.skillMastery, 0, 1, 0.5),
  };

  if (!isAiConfigured()) {
    return NextResponse.json({
      ...base,
      explained: true,
      text: feedbackFallback(input),
      live: false,
      fallbackReason: 'AI-ключ не настроен на сервере',
    });
  }

  try {
    const result = await generateText({
      system: feedbackSystem(body.language ?? 'ru'),
      prompt: feedbackPrompt(input),
      temperature: 0.3,
      maxOutputTokens: 2500,
      timeoutMs: 15_000,
      /* Разбор ученик ждёт глядя на экран, поэтому потолок ниже общего:
         лучше заготовка через двадцать секунд, чем живой текст через минуту. */
      budgetMs: 20_000,
    });
    return NextResponse.json({ ...base, explained: true, text: result.text, live: true, model: result.model });
  } catch (error) {
    const reason = error instanceof AiUnavailableError ? error.message : 'Неизвестная ошибка AI';
    // Ученик всё равно получает разбор — из эталонного решения задания.
    return NextResponse.json({ ...base, explained: true, text: feedbackFallback(input), live: false, fallbackReason: reason });
  }
}
