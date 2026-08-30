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
import { LIMITS, clampNumber, clampTextList, clampText, sanitizeProfile } from '@/lib/ai/sanitize';
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
        mastery: clampNumber(item.mastery, 0, 1, 0),
        readiness: 1,
        /* Причины отбора приходят от браузера и попадают в промпт текстом.
           Раньше они уходили туда без проверки длины и типа. */
        reasons: clampTextList(item.reasons, LIMITS.reasons, LIMITS.reason),
        status: 'new',
      };
    })
    .filter((item): item is RankedTopic => item !== null)
    .slice(0, 3);

  const weakSkills: SkillMasteryEntry[] = weakInput.slice(0, LIMITS.topics).map((item) => ({
    skill: {
      id: clampText(item.skillId, 80),
      subjectId: subject.id,
      title: clampText(item.title, LIMITS.title),
      grades: [],
    },
    mastery: clampNumber(item.mastery, 0, 1, 0),
    attempts: 0,
  }));

  const input: PlanInput = {
    subject,
    profile: sanitizeProfile(body.profile),
    diagnostic: body.diagnostic ?? null,
    ranked,
    weakSkills,
    daysLeft: typeof body.daysLeft === 'number' ? clampNumber(body.daysLeft, 0, 3650, 0) : null,
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
