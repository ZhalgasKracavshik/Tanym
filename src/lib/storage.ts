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

import type { AppState } from './types';

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
    customTopics: [],
    plans: {},
    chat: [],
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
      customTopics: Array.isArray(parsed.customTopics) ? parsed.customTopics : [],
      plans: parsed.plans ?? {},
      chat: Array.isArray(parsed.chat) ? parsed.chat : [],
    };
  } catch {
    // Битый JSON — не роняем приложение, начинаем с чистого состояния.
    return emptyState();
  }
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
