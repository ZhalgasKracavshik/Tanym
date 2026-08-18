/**
 * Запасные ответы на случай, когда языковая модель недоступна.
 *
 * Зачем это нужно: живая демонстрация MVP оценивается отдельным критерием,
 * и падать из-за чужого API (кончилась квота, нет интернета в зале, таймаут)
 * непозволительно. Поэтому каждый AI-сценарий имеет детерминированный дублёр,
 * собранный из тех же данных, что уходят в модель.
 *
 * Пользователю при этом честно показывается, что ответ собран без модели —
 * см. флаг `live` в AiResponse и компонент AiBadge.
 */

import { correctAnswerText, studentAnswerText } from '../grading';
import type { FeedbackInput, PlanInput, ChatInput } from './prompts';

export function feedbackFallback(input: FeedbackInput): string {
  const { task, correct, answer } = input;

  if (correct) {
    return `Верно. ${task.explanation}

Закрепи результат: попробуй решить следующее задание этой темы — система уже подобрала его под твой уровень.`;
  }

  return `Пока не верно. Твой ответ: ${studentAnswerText(task, answer)}, правильный: ${correctAnswerText(task)}.

Разбор: ${task.explanation}

Подсказка на будущее: ${task.hint}`;
}

export function planFallback(input: PlanInput): string {
  const { subject, diagnostic, ranked, weakSkills, daysLeft } = input;

  const intro = diagnostic
    ? `Диагностика по предмету «${subject.title}» пройдена на ${Math.round(diagnostic.score * 100)}%. Система построила план от твоих слабых мест к более сложным темам.`
    : `План по предмету «${subject.title}» построен по твоему классу и цели. Пройди диагностику — и он станет точнее.`;

  const weak = weakSkills.length
    ? `Сейчас слабее всего: ${weakSkills.map((s) => `${s.skill.title} (${Math.round(s.mastery * 100)}%)`).join(', ')}.`
    : 'Явных пробелов пока не видно — идём по программе.';

  const topics = ranked
    .map((r, i) => `${i + 1}. ${r.topic.title} — освоено ${Math.round(r.mastery * 100)}%. ${r.reasons[0]}.`)
    .join('\n');

  const deadline =
    daysLeft !== null && daysLeft >= 0
      ? `\n\nДо твоей целевой даты осталось ${daysLeft} дн. — держи темп примерно одна тема в два дня.`
      : '';

  const first = ranked[0];
  const nextStep = first
    ? `\n\nПервый шаг: открой тему «${first.topic.title}», прочитай теорию и реши задания — это займёт около ${first.topic.estimatedMinutes} минут.`
    : '';

  return `${intro}

${weak}

${topics}${deadline}${nextStep}`;
}

export function chatFallback(input: ChatInput): string {
  const { topic } = input;

  if (topic) {
    return `Сейчас AI-наставник недоступен, но по теме «${topic.title}» есть готовый разбор.

${topic.material.keyPoints.map((point) => `— ${point}`).join('\n')}

Открой материал темы: там разобраны примеры с решениями. Когда связь восстановится, я отвечу подробнее.`;
  }

  return `Сейчас AI-наставник недоступен. Открой любую тему из своего плана — теория и разбор примеров работают без интернета, а я подключусь, как только связь восстановится.`;
}
