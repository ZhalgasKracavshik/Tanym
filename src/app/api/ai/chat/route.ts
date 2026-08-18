/**
 * POST /api/ai/chat — AI-наставник, отвечающий на вопросы ученика.
 *
 * Контекст (класс, цель, текущая тема) подставляется на сервере из реестра
 * контента: клиент присылает только идентификаторы. Так промпт всегда опирается
 * на реальный учебный материал, а не на то, что прислал браузер.
 */

import { NextResponse } from 'next/server';
import { getSubject, getTopic } from '@/data';
import { AiUnavailableError, generateText, isAiConfigured } from '@/lib/ai/gemini';
import { chatPrompt, chatSystem, type ChatInput } from '@/lib/ai/prompts';
import { chatFallback } from '@/lib/ai/fallback';
import { checkRateLimit, clientKeyFromRequest } from '@/lib/ai/rate-limit';
import type { ChatRequest, ChatResponse } from '@/lib/ai/contracts';

const MAX_QUESTION_LENGTH = 600;

export async function POST(request: Request): Promise<NextResponse<ChatResponse | { error: string }>> {
  const limit = checkRateLimit(clientKeyFromRequest(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Слишком много запросов. Повторите через ${limit.retryAfterSeconds} с.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) } },
    );
  }

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON в теле запроса' }, { status: 400 });
  }

  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return NextResponse.json({ error: 'Пустой вопрос' }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Вопрос слишком длинный: максимум ${MAX_QUESTION_LENGTH} символов` },
      { status: 400 },
    );
  }

  const topic = getTopic(body.topicId);
  const subject = getSubject(body.subjectId ?? topic?.subjectId);

  const input: ChatInput = {
    question,
    history: Array.isArray(body.history) ? body.history.slice(-6) : [],
    profile: body.profile ?? null,
    topic: topic ?? null,
    subject: subject ?? null,
  };

  if (!isAiConfigured()) {
    return NextResponse.json({
      text: chatFallback(input),
      live: false,
      fallbackReason: 'AI-ключ не настроен на сервере',
    });
  }

  try {
    const result = await generateText({
      system: chatSystem(body.language ?? 'ru'),
      prompt: chatPrompt(input),
      temperature: 0.6,
      maxOutputTokens: 2500,
      timeoutMs: 20_000,
    });
    return NextResponse.json({ text: result.text, live: true, model: result.model });
  } catch (error) {
    const reason = error instanceof AiUnavailableError ? error.message : 'Неизвестная ошибка AI';
    return NextResponse.json({ text: chatFallback(input), live: false, fallbackReason: reason });
  }
}
