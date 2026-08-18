/**
 * POST /api/ai/plan — объяснение персонального учебного плана.
 *
 * Что делает движок, а что модель:
 *   движок (lib/personalization.ts) уже посчитал, какие темы и почему;
 *   модель получает готовые цифры и причины и переводит их в связный текст.
 * Поэтому объяснение никогда не расходится с тем, что ученик видит на экране.
 */

import { NextResponse } from 'next/server';
import { getSubject, getTopic } from '@/data';
import { AiUnavailableError, generateText, isAiConfigured } from '@/lib/ai/gemini';
import { planPrompt, planSystem, type PlanInput } from '@/lib/ai/prompts';
import { planFallback } from '@/lib/ai/fallback';
import { checkRateLimit, clientKeyFromRequest } from '@/lib/ai/rate-limit';
import type { PlanRequest, PlanResponse } from '@/lib/ai/contracts';
import type { RankedTopic, SkillMasteryEntry } from '@/lib/types';

export async function POST(request: Request): Promise<NextResponse<PlanResponse | { error: string }>> {
  const limit = checkRateLimit(clientKeyFromRequest(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Слишком много запросов. Повторите через ${limit.retryAfterSeconds} с.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds ?? 60) } },
    );
  }

  let body: PlanRequest;
  try {
    body = (await request.json()) as PlanRequest;
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON в теле запроса' }, { status: 400 });
  }

  const subject = getSubject(body?.subjectId);
  if (!subject) {
    return NextResponse.json({ error: 'Предмет не найден' }, { status: 404 });
  }

  // Восстанавливаем полные темы по идентификаторам: клиент прислал только id,
  // проценты и причины — весь остальной контент сервер берёт из реестра.
  /*
   * Массивы приводим к безопасному виду до использования.
   *
   * Проверять только Array.isArray мало: тело {"ranked": "abc"} прошло бы мимо
   * `?? []`, а `.map` у строки нет — роут падал бы с ошибкой 500 вместо честного
   * отказа. Элементы тоже фильтруем: [null] ронял обращение к полю.
   */
  const rankedInput = Array.isArray(body.ranked)
    ? body.ranked.filter((item): item is NonNullable<typeof item> => Boolean(item) && typeof item === 'object')
    : [];
  const weakInput = Array.isArray(body.weakSkills)
    ? body.weakSkills.filter((item): item is NonNullable<typeof item> => Boolean(item) && typeof item === 'object')
    : [];

  const ranked: RankedTopic[] = rankedInput
    // Явная аннотация нужна, иначе TypeScript выводит status как литерал 'new'
    // и потом отказывается считать результат совместимым с RankedTopic.
    .map((item): RankedTopic | null => {
      const topic = getTopic(item.topicId);
      if (!topic) return null;
      return {
        topic,
        score: 0,
        mastery: item.mastery,
        readiness: 1,
        reasons: item.reasons ?? [],
        status: 'new',
      };
    })
    .filter((item): item is RankedTopic => item !== null)
    .slice(0, 3);

  const weakSkills: SkillMasteryEntry[] = weakInput.map((item) => ({
    skill: { id: item.skillId, subjectId: subject.id, title: item.title, grades: [] },
    mastery: item.mastery,
    attempts: 0,
  }));

  const input: PlanInput = {
    subject,
    profile: body.profile ?? null,
    diagnostic: body.diagnostic ?? null,
    ranked,
    weakSkills,
    daysLeft: body.daysLeft ?? null,
  };

  if (!isAiConfigured()) {
    return NextResponse.json({
      text: planFallback(input),
      live: false,
      fallbackReason: 'AI-ключ не настроен на сервере',
    });
  }

  try {
    const result = await generateText({
      system: planSystem(body.language ?? 'ru'),
      prompt: planPrompt(input),
      temperature: 0.5,
      maxOutputTokens: 3500,
      timeoutMs: 20_000,
    });
    return NextResponse.json({ text: result.text, live: true, model: result.model });
  } catch (error) {
    const reason = error instanceof AiUnavailableError ? error.message : 'Неизвестная ошибка AI';
    return NextResponse.json({ text: planFallback(input), live: false, fallbackReason: reason });
  }
}
