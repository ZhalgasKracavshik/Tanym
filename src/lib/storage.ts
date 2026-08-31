/**
 * Сохранение состояния ученика в localStorage.
 *
 * Почему не база данных: по условиям кейса допускается mock-хранилище, а для
 * MVP браузерное хранилище даёт главное — данные переживают перезагрузку
 * страницы, и путь ученика (диагностика → план → задания → прогресс)
 * ощущается настоящим. Вся структура AppState спроектирована так, чтобы
 * позже один в один лечь в таблицы Postgres без переписывания интерфейсов.
 *
 * Чего здесь осознанно нет: паролей и настоящей авторизации. Роль выбирается
 * на входе. Для публичного продукта это следующий шаг, для демонстрации —
 * лишний экран между жюри и продуктом.
 */

import type { AppState, ChatMessage, Conversation } from './types';

export const STORAGE_KEY = 'tanym.state.v1';
export const CURRENT_VERSION = 1;

export function emptyState(): AppState {
  return {
    version: CURRENT_VERSION,
    language: 'ru',
    profile: null,
    diagnostics: {},
    attempts: [],
    topicProgress: {},
    difficulty: {},
    points: 0,
    streak: { current: 0, longest: 0, lastActiveDate: null },
    seenAchievements: [],
    eventRegistrations: [],
    myListings: [],
    readAnnouncements: [],
    leaderboardAnonymous: false,
    customTopics: [],
    plans: {},
    conversations: [],
    activeChatId: null,
  };
}

/**
 * Читает состояние из localStorage.
 * На сервере (при рендере на стороне Next.js) localStorage не существует,
 * поэтому возвращаем пустое состояние — клиент подхватит настоящее в useEffect.
 */
export function loadState(): AppState {
  if (typeof window === 'undefined') return emptyState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();

    const parsed = JSON.parse(raw) as Partial<AppState>;

    // Состояние от несовместимой версии не мигрируем, а начинаем заново:
    // для MVP это честнее, чем чинить данные неизвестной формы.
    if (parsed.version !== CURRENT_VERSION) return emptyState();

    // Подстраховка от повреждённых данных: каждое поле проверяем отдельно
    // и подставляем пустое значение, если тип не тот.
    return {
      version: CURRENT_VERSION,
      // Состояния, сохранённые до появления мультиязычности, языка не содержат —
      // подставляем русский, чтобы старый прогресс не сбрасывался.
      language: parsed.language ?? 'ru',
      profile: parsed.profile ?? null,
      diagnostics: parsed.diagnostics ?? {},
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      topicProgress: parsed.topicProgress ?? {},
      difficulty: parsed.difficulty ?? {},
      points: typeof parsed.points === 'number' ? parsed.points : 0,
      // Поля геймификации появились позже — у старых сохранений их нет.
      streak: parsed.streak ?? { current: 0, longest: 0, lastActiveDate: null },
      seenAchievements: Array.isArray(parsed.seenAchievements) ? parsed.seenAchievements : [],
      eventRegistrations: Array.isArray(parsed.eventRegistrations) ? parsed.eventRegistrations : [],
      myListings: Array.isArray(parsed.myListings) ? parsed.myListings : [],
      readAnnouncements: Array.isArray(parsed.readAnnouncements) ? parsed.readAnnouncements : [],
      leaderboardAnonymous: parsed.leaderboardAnonymous === true,
      customTopics: Array.isArray(parsed.customTopics) ? parsed.customTopics : [],
      plans: parsed.plans ?? {},
      conversations: readConversations(parsed),
      activeChatId: typeof parsed.activeChatId === 'string' ? parsed.activeChatId : null,
    };
  } catch {
    // Битый JSON — не роняем приложение, начинаем с чистого состояния.
    return emptyState();
  }
}

/**
 * Разговоры из сохранённого состояния, с переносом старой переписки.
 *
 * До появления нескольких разговоров в состоянии лежал один плоский
 * список сообщений в поле chat. Просто выбросить его нельзя: у людей,
 * которые уже пользовались наставником, на глазах пропала бы вся
 * переписка. Поэтому старый список становится первым разговором.
 *
 * Версия состояния при этом не поднималась намеренно: подъём версии в
 * этом проекте означает полный сброс прогресса, а здесь достаточно
 * подстановки, и терять диагностику с попытками ради переезда чата
 * было бы несоразмерно.
 */
function readConversations(parsed: Partial<AppState> & { chat?: unknown }): Conversation[] {
  if (Array.isArray(parsed.conversations)) return parsed.conversations;

  const legacy = Array.isArray(parsed.chat) ? (parsed.chat as ChatMessage[]) : [];
  if (legacy.length === 0) return [];

  const firstQuestion = legacy.find((message) => message.role === 'user')?.content ?? 'Разговор';
  const at = legacy[0]?.at ?? new Date(0).toISOString();
  return [
    {
      id: 'legacy',
      title: firstQuestion.slice(0, 60),
      messages: legacy,
      createdAt: at,
      updatedAt: legacy.at(-1)?.at ?? at,
    },
  ];
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Хранилище может быть переполнено или отключено в приватном режиме.
    // Приложение продолжит работать в памяти до перезагрузки страницы.
  }
}

export function clearState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // игнорируем — очистка не критична
  }
}

/** Идентификатор для профиля и записей. crypto.randomUUID есть во всех современных браузерах. */
export function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}
