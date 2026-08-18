/**
 * Сборка промптов для языковой модели.
 *
 * Главный принцип: модель НЕ придумывает факты о знаниях ученика и не решает
 * задачу заново. Мы сами (движком персонализации) считаем цифры и сами храним
 * эталонное решение, а модель получает всё это готовым и только объясняет
 * человеческим языком. Так ответ всегда согласован с тем, что видит ученик
 * на экране, и модель не может «сочинить» неверную математику.
 */

import { correctAnswerText, studentAnswerText } from '../grading';
import type {
  ChatMessage,
  DiagnosticResult,
  Language,
  Profile,
  RankedTopic,
  SkillMasteryEntry,
  Subject,
  Task,
  Topic,
} from '../types';
import { LEARNING_GOALS } from '../types';
import { LANGUAGE_NAME } from '../i18n-shared';

/**
 * Личность наставника. Язык ответа подставляется параметром: интерфейс
 * переведён на три языка, и модель обязана отвечать на том же, что выбрал ученик.
 *
 * Отдельно оговорено, что учебный контент остаётся русским: темы и условия
 * заданий не переведены, и без этой оговорки модель, отвечая по-казахски,
 * начинала бы переводить названия тем и путать ученика.
 */
const persona = (language: Language) => `Ты — Tanym, AI-наставник для школьников Казахстана 7–12 классов.
Отвечай ТОЛЬКО на ${LANGUAGE_NAME[language]} языке, простыми словами, обращайся к ученику на «ты».
Учебные материалы тебе дают на русском языке — это нормально: пойми их и объясни на нужном языке.
Названия тем и предметов оставляй как есть, не переводи их.
Тон — спокойный и поддерживающий, без снисходительности и без восторженных восклицаний.
Не используй markdown-заголовки и списки со звёздочками.
Пиши короткими абзацами, разделяя их пустой строкой.

Не используй длинное тире. Вместо него ставь запятую, двоеточие или точку.
Не начинай предложения с оборотов «стоит отметить», «важно понимать», «давай разберёмся».
Не ставь эмодзи. Пиши предложениями разной длины, а не одинаковыми.

Формулы записывай обычным текстом: x^2 - 5x + 6 = 0, S = v * t, 1/2.
Не используй LaTeX и знаки доллара — интерфейс показывает твой ответ как простой
текст, и разметка вида \\cdot или $...$ попадёт ученику на экран как есть.`;

function goalTitle(profile: Profile | null): string {
  if (!profile) return 'обучение';
  return LEARNING_GOALS.find((g) => g.id === profile.goal)?.title ?? 'обучение';
}

/* ------------------------------------------------------------------ */
/*  1. Обратная связь по заданию                                       */
/* ------------------------------------------------------------------ */

export interface FeedbackInput {
  task: Task;
  topic: Topic;
  subject: Subject;
  answer: string;
  correct: boolean;
  profile: Profile | null;
  /** Владение навыком до этой попытки, 0..1. */
  skillMastery: number;
}

export function feedbackSystem(language: Language): string {
  return `${persona(language)}

Твоя задача — разобрать ответ ученика на конкретное задание.
Опирайся строго на эталонное решение, которое тебе дают: не придумывай свой способ и не меняй ответ.
Если ученик ошибся — сначала назови, в чём именно ошибка, потом объясни правильный ход мысли по шагам.
Если ученик ответил верно — подтверди это одной фразой и добавь одну мысль, которая углубляет понимание.
Уложись в 90 слов.`;
}

export function feedbackPrompt(input: FeedbackInput): string {
  const { task, topic, subject, answer, correct, profile, skillMastery } = input;

  return `Предмет: ${subject.title}
Тема: ${topic.title}
Класс ученика: ${profile?.grade ?? 'не указан'}
Цель ученика: ${goalTitle(profile)}
Владение этим навыком до попытки: ${Math.round(skillMastery * 100)}%

Задание: ${task.prompt}
${task.kind === 'single' && task.options ? `Варианты ответа: ${task.options.join(' | ')}` : ''}
Ответ ученика: ${studentAnswerText(task, answer)}
Правильный ответ: ${correctAnswerText(task)}
Результат: ${correct ? 'ВЕРНО' : 'ОШИБКА'}

Эталонное решение (опирайся на него): ${task.explanation}

Напиши разбор для ученика.`;
}

/* ------------------------------------------------------------------ */
/*  2. Объяснение персонального плана                                  */
/* ------------------------------------------------------------------ */

export interface PlanInput {
  subject: Subject;
  profile: Profile | null;
  diagnostic: DiagnosticResult | null;
  ranked: RankedTopic[];
  weakSkills: SkillMasteryEntry[];
  daysLeft: number | null;
}

export function planSystem(language: Language): string {
  return `${persona(language)}

Твоя задача — объяснить ученику его персональный учебный план.
Тебе дают готовые расчёты системы: уровень по диагностике, слабые навыки в процентах
и отобранные темы с причинами. Опирайся только на эти данные и не выдумывай новые цифры.

Структура ответа:
первый абзац — что показала диагностика и на чём сейчас сосредоточиться;
затем по одному короткому абзацу на каждую рекомендованную тему: почему именно она и что она даёт;
последний абзац — конкретный первый шаг на ближайшее занятие.
Уложись в 180 слов.`;
}

export function planPrompt(input: PlanInput): string {
  const { subject, profile, diagnostic, ranked, weakSkills, daysLeft } = input;

  const diagnosticLine = diagnostic
    ? `Диагностика пройдена: ${Math.round(diagnostic.score * 100)}% верных ответов, уровень «${levelRu(diagnostic.level)}».`
    : 'Диагностика ещё не пройдена — опирайся только на выбранную цель и класс.';

  const weakLine = weakSkills.length
    ? weakSkills.map((s) => `${s.skill.title} — ${Math.round(s.mastery * 100)}%`).join('; ')
    : 'явных провалов пока не видно';

  const topicsBlock = ranked
    .map((r, i) => `${i + 1}. «${r.topic.title}» (освоено ${Math.round(r.mastery * 100)}%). Причины отбора: ${r.reasons.join('; ')}. Что внутри: ${r.topic.summary}`)
    .join('\n');

  return `Предмет: ${subject.title}
Класс: ${profile?.grade ?? 'не указан'}
Цель: ${goalTitle(profile)}
${daysLeft !== null ? `До целевой даты осталось дней: ${daysLeft}` : 'Целевая дата не указана.'}
${diagnosticLine}
Слабые навыки: ${weakLine}

Темы, отобранные системой:
${topicsBlock}

Объясни ученику этот план.`;
}

/* ------------------------------------------------------------------ */
/*  3. Чат с наставником                                               */
/* ------------------------------------------------------------------ */

export interface ChatInput {
  history: ChatMessage[];
  question: string;
  profile: Profile | null;
  topic: Topic | null;
  subject: Subject | null;
}

export function chatSystem(language: Language): string {
  return `${persona(language)}

Ты отвечаешь на вопросы ученика по школьной программе.
Если вопрос по теме, которую ученик сейчас проходит, объясняй с опорой на неё.
Если ученик просит решить за него домашнее задание — не выдавай готовый ответ,
а разбери метод и предложи ему сделать следующий шаг самому.
Если вопрос не про учёбу — коротко верни разговор к предмету.
Уложись в 130 слов.`;
}

export function chatPrompt(input: ChatInput): string {
  const { history, question, profile, topic, subject } = input;

  const context = [
    `Класс ученика: ${profile?.grade ?? 'не указан'}`,
    `Цель: ${goalTitle(profile)}`,
    subject ? `Текущий предмет: ${subject.title}` : null,
    topic ? `Текущая тема: «${topic.title}» — ${topic.summary}` : null,
    topic ? `Ключевые мысли темы: ${topic.material.keyPoints.join('; ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // Историю сериализуем в текст: так весь диалог виден модели одним куском,
  // а кэш в gemini.ts автоматически различает разные ветки разговора.
  const dialogue = history
    .slice(-6) // держим последние 6 реплик, чтобы промпт не разрастался
    .map((m) => `${m.role === 'user' ? 'Ученик' : 'Наставник'}: ${m.content}`)
    .join('\n');

  return `${context}

${dialogue ? `Предыдущий разговор:\n${dialogue}\n` : ''}
Новый вопрос ученика: ${question}`;
}

function levelRu(level: DiagnosticResult['level']): string {
  return level === 'advanced' ? 'продвинутый' : level === 'intermediate' ? 'средний' : 'начальный';
}
