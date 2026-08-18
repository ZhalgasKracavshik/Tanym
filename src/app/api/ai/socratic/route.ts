/**
 * POST /api/ai/socratic — диалог с наставником по методу Сократа.
 *
 * Разделение ответственности здесь такое же, как во всех AI-роутах проекта:
 * решил ли ученик задачу, определяет СЕРВЕР детерминированной проверкой
 * (matchesArchiveAnswer), а модель только ведёт разговор. Если бы вердикт
 * выносила модель, она могла бы засчитать неверный ответ из вежливости —
 * а это худшее, что может сделать учебный продукт.
 */

import { NextResponse } from 'next/server';
import { getArchiveTask, getMaterial } from '@/data/archive';
import { matchesArchiveAnswer } from '@/lib/archive-answer';
import { AiUnavailableError, generateText, isAiConfigured } from '@/lib/ai/gemini';
import {
  socraticPrompt,
  socraticSuccessPrompt,
  socraticSuccessSystem,
  socraticSystem,
} from '@/lib/ai/socratic';
import { checkRateLimit, clientKeyFromRequest } from '@/lib/ai/rate-limit';
import type { SocraticRequest, SocraticResponse } from '@/lib/ai/contracts';

export async function POST(
  request: Request,
): Promise<NextResponse<SocraticResponse | { error: string }>> {
  const limit = checkRateLimit(clientKeyFromRequest(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Слишком много запросов. Повторите через ${limit.retryAfterSeconds} с.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) } },
    );
  }

  let body: SocraticRequest;
  try {
    body = (await request.json()) as SocraticRequest;
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON в теле запроса' }, { status: 400 });
  }

  if (typeof body?.taskId !== 'string' || typeof body?.message !== 'string') {
    return NextResponse.json({ error: 'Нужны поля taskId и message' }, { status: 400 });
  }

  const task = getArchiveTask(body.taskId);
  if (!task) {
    return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
  }

  const material = getMaterial(task.materialId);
  const language = body.language ?? 'ru';
  const history = Array.isArray(body.history) ? body.history : [];

  // Вердикт выносит код, а не модель.
  const solved = matchesArchiveAnswer(task, body.message);

  // Сколько раз ученик уже отвечал — по этому числу решаем, пора ли
  // делать подсказки конкретнее.
  const studentTurns = history.filter((message) => message.role === 'user').length + 1;

  if (!isAiConfigured()) {
    return NextResponse.json({
      text: solved
        ? `Верно, ответ ${task.answer}${task.unit ? ` ${task.unit}` : ''}. Разбор доступен по кнопке ниже.`
        : 'Наставник сейчас недоступен. Попробуй разобрать задачу по подсказке к ней, а полное решение можно открыть кнопкой ниже.',
      live: false,
      solved,
      fallbackReason: 'AI-ключ не настроен на сервере',
    });
  }

  try {
    const result = await generateText({
      system: solved ? socraticSuccessSystem(language) : socraticSystem(language, studentTurns),
      prompt: solved
        ? socraticSuccessPrompt(task, body.message)
        : socraticPrompt({
            task,
            materialTitle: material?.title ?? '',
            history,
            studentMessage: body.message,
            profile: body.profile ?? null,
          }),
      // Температура ниже, чем в свободном чате: наводящий вопрос должен быть
      // точным, а не изобретательным.
      temperature: 0.4,
      maxOutputTokens: 2000,
      timeoutMs: 20_000,
    });

    return NextResponse.json({ text: result.text, live: true, solved, model: result.model });
  } catch (error) {
    const reason = error instanceof AiUnavailableError ? error.message : 'Неизвестная ошибка AI';
    return NextResponse.json({
      text: solved
        ? `Верно, ответ ${task.answer}${task.unit ? ` ${task.unit}` : ''}.`
        : 'Связь с наставником прервалась. Попробуй ещё раз или открой разбор кнопкой ниже.',
      live: false,
      solved,
      fallbackReason: reason,
    });
  }
}
