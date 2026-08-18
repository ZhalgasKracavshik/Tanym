/**
 * POST /api/ai/feedback — разбор ответа ученика на задание.
 *
 * Ключевое решение: правильность ответа определяет СЕРВЕР, а не клиент.
 * Клиент присылает только сам ответ; сервер находит задание в реестре,
 * сверяет и уже потом просит модель объяснить результат. Иначе достаточно
 * было бы подделать один флаг в запросе, чтобы получить «верно» на что угодно.
 */

import { NextResponse } from 'next/server';
import { getSubject, getTask, getTopic } from '@/data';
import { checkAnswer, correctAnswerText } from '@/lib/grading';
import { AiUnavailableError, generateText, isAiConfigured } from '@/lib/ai/gemini';
import { feedbackPrompt, feedbackSystem, type FeedbackInput } from '@/lib/ai/prompts';
import { feedbackFallback } from '@/lib/ai/fallback';
import { checkRateLimit, clientKeyFromRequest } from '@/lib/ai/rate-limit';
import type { FeedbackRequest, FeedbackResponse } from '@/lib/ai/contracts';

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
  const task = getTask(body.taskId) ?? body.task;
  if (!task) {
    return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
  }

  const topic = getTopic(body.topicId ?? task.topicId);
  const subject = getSubject(topic?.subjectId);
  const correct = checkAnswer(task, body.answer);

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
      icon: '📘',
      accent: 'var(--accent-blue)',
      grades: [],
      skills: [],
      topics: [],
      diagnostic: [],
    },
    answer: body.answer,
    correct,
    profile: body.profile ?? null,
    skillMastery: typeof body.skillMastery === 'number' ? body.skillMastery : 0.5,
  };

  const base = { correct, correctAnswer: correctAnswerText(task) };

  if (!isAiConfigured()) {
    return NextResponse.json({
      ...base,
      text: feedbackFallback(input),
      live: false,
      fallbackReason: 'AI-ключ не настроен на сервере',
    });
  }

  try {
    const result = await generateText({
      system: feedbackSystem(),
      prompt: feedbackPrompt(input),
      temperature: 0.3,
      maxOutputTokens: 2500,
      timeoutMs: 15_000,
    });
    return NextResponse.json({ ...base, text: result.text, live: true, model: result.model });
  } catch (error) {
    const reason = error instanceof AiUnavailableError ? error.message : 'Неизвестная ошибка AI';
    // Ученик всё равно получает разбор — из эталонного решения задания.
    return NextResponse.json({ ...base, text: feedbackFallback(input), live: false, fallbackReason: reason });
  }
}
