'use client';

/**
 * Настройка, которая живёт в браузере пользователя.
 *
 * Зачем отдельный помощник. Такие настройки уже есть (кегль ответа
 * модели), добавляются новые (свёрнутое меню), и каждая требует одного и
 * того же неочевидного набора: чтение localStorage, кэш снимка,
 * детерминированное значение для серверного рендера и рассылка
 * подписчикам. Скопировать этот набор в третий раз означало бы три места,
 * где можно по-разному ошибиться.
 *
 * Почему useSyncExternalStore, а не useState с эффектом. Значение живёт
 * вне React, и хук для этого предназначен: он сам разводит серверный и
 * клиентский снимок. Через состояние с эффектом пришлось бы рисовать
 * первый кадр с чужим значением и переписывать его после гидратации —
 * это заметное мигание, и линтер справедливо ругается на установку
 * состояния в эффекте.
 *
 * Зачем своя рассылка, если есть событие storage. Событие storage
 * приходит только в ДРУГИЕ вкладки, а не в ту, где значение поменяли.
 * Без собственного списка подписчиков соседние блоки на этой же странице
 * не обновились бы, и настройка выглядела бы сломанной.
 */

import { useCallback, useSyncExternalStore } from 'react';

export interface LocalSetting<T> {
  /** Хук: текущее значение. Вызывается по правилам хуков. */
  use: () => T;
  set: (value: T) => void;
  read: () => T;
}

export function createLocalSetting<T>(
  storageKey: string,
  fallback: T,
  parse: (raw: string) => T | null,
  serialize: (value: T) => string = String,
): LocalSetting<T> {
  const listeners = new Set<() => void>();

  /* Кэш снимка: useSyncExternalStore спрашивает значение часто, а меняем
     хранилище только мы сами. */
  let cached: T | null = null;

  function read(): T {
    if (cached !== null) return cached;
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(storageKey);
      cached = raw === null ? fallback : (parse(raw) ?? fallback);
    } catch {
      cached = fallback;
    }
    return cached;
  }

  /* На сервере хранилища нет, и снимок обязан быть одинаковым при каждом
     вызове, иначе серверная и клиентская разметка разойдутся. */
  const getServerSnapshot = () => fallback;

  function subscribe(notify: () => void): () => void {
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  }

  function set(value: T) {
    cached = value;
    try {
      window.localStorage.setItem(storageKey, serialize(value));
    } catch {
      // Приватный режим или запрет на хранилище: настройка не переживёт
      // перезагрузку, но в текущей сессии обязана работать.
    }
    listeners.forEach((notify) => notify());
  }

  return {
    use: () => useSyncExternalStore(subscribe, read, getServerSnapshot),
    set,
    read,
  };
}

/** Свёрнутое боковое меню. По умолчанию развёрнуто. */
export const sidebarCollapsed = createLocalSetting<boolean>(
  'tanym.sidebarCollapsed',
  false,
  (raw) => (raw === '1' ? true : raw === '0' ? false : null),
  (value) => (value ? '1' : '0'),
);

/** Удобная обёртка: значение и переключатель одной строкой. */
export function useSidebarCollapsed(): [boolean, () => void] {
  const collapsed = sidebarCollapsed.use();
  const toggle = useCallback(() => sidebarCollapsed.set(!sidebarCollapsed.read()), []);
  return [collapsed, toggle];
}
