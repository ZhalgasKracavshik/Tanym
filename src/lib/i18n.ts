/**
 * Мультиязычность: русский, казахский, английский.
 *
 * Подход намеренно простой — без библиотек. Каждая страница объявляет свой
 * объект TEXT с тремя языками и берёт нужный по текущему языку:
 *
 *   const lang = useLang();
 *   const t = TEXT[lang];
 *   <h1>{t.title}</h1>
 *
 * Почему так, а не через t('page.title') с общим словарём:
 *   1. Видно текст рядом с разметкой, где он используется.
 *   2. TypeScript сам следит, чтобы во всех трёх языках были одинаковые поля —
 *      забытый перевод не доедет до продакшена, сборка упадёт.
 *   3. Страницы не конфликтуют: у каждой свой объект, общего файла на всех нет.
 *
 * Что переведено: весь интерфейс и ответы AI. Учебный контент (темы и задания)
 * остаётся на русском — это осознанное ограничение MVP, перевод 96 заданий
 * требует работы методистов, а не программиста.
 */

import { useStore } from '@/components/StoreProvider';
import type { Language } from './types';
import { LANGUAGES, LANGUAGE_NAME } from './i18n-shared';

export type { Language };
export { LANGUAGES, LANGUAGE_NAME };

/**
 * Тип словаря страницы: три языка с одинаковым набором полей.
 * Использование: const TEXT: Dict<{ title: string }> = { ru: {...}, kk: {...}, en: {...} }
 */
export type Dict<T> = Record<Language, T>;

/** Текущий язык интерфейса. */
export function useLang(): Language {
  const { state } = useStore();
  return state.language;
}

/** Общие подписи, которые встречаются на нескольких страницах. */
export const COMMON: Dict<{
  loading: string;
  back: string;
  next: string;
  cancel: string;
  save: string;
  createProfile: string;
  noProfileTitle: string;
  noProfileText: string;
  aiAnswer: string;
  aiFallback: string;
  minutes: string;
}> = {
  ru: {
    loading: 'Загрузка…',
    back: 'Назад',
    next: 'Далее',
    cancel: 'Отмена',
    save: 'Сохранить',
    createProfile: 'Создать профиль',
    noProfileTitle: 'Сначала нужен профиль',
    noProfileText: 'Укажите класс, предметы и цель — без этого страница пустая.',
    aiAnswer: 'Ответ AI',
    aiFallback: 'Разбор без AI',
    minutes: 'мин',
  },
  kk: {
    loading: 'Жүктелуде…',
    back: 'Артқа',
    next: 'Әрі қарай',
    cancel: 'Болдырмау',
    save: 'Сақтау',
    createProfile: 'Профиль құру',
    noProfileTitle: 'Алдымен профиль қажет',
    noProfileText: 'Сыныбыңды, пәндерді және мақсатыңды көрсет — онсыз бет бос болады.',
    aiAnswer: 'AI жауабы',
    aiFallback: 'AI-сыз талдау',
    minutes: 'мин',
  },
  en: {
    loading: 'Loading…',
    back: 'Back',
    next: 'Next',
    cancel: 'Cancel',
    save: 'Save',
    createProfile: 'Create profile',
    noProfileTitle: 'A profile is needed first',
    noProfileText: 'Set your grade, subjects and goal — the page is empty without them.',
    aiAnswer: 'AI answer',
    aiFallback: 'Offline explanation',
    minutes: 'min',
  },
};
