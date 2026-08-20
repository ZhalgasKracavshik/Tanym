'use client';

/**
 * Состояние входа через школьный аккаунт.
 *
 * Три состояния, а не два: гость (можно всё смотреть), вошёл без профиля
 * (сессия есть, роль ещё не выбрана — окно между входом и ответом на
 * «ты ученик или учитель»), вошёл с профилем (можно публиковать).
 *
 * Почему провайдер, а не просто хук. Раньше каждый вызывающий компонент
 * (сайдбар, ворота публикации, синхронизация прогресса, рейтинг) делал
 * собственный запрос к /api/profile — на одной странице их набегало шесть
 * штук подряд, и панель администратора из-за этого заметно тормозила.
 * Теперь запрос ровно один на всё приложение, остальные читают контекст.
 *
 * Роль дополнительно кладётся в localStorage. Это не кэш ради скорости,
 * а лекарство от мигания меню: без него первый кадр рисовался с ролью null,
 * то есть с полным гостевым меню, и через секунду половина пунктов исчезала
 * прямо на глазах у вошедшего учителя.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createClient } from './client';

export interface SchoolProfile {
  id: string;
  /**
   * 'admin' никогда не выбирается на форме входа — только вручную через SQL
   * (см. profiles в Supabase). chooseRole ниже принимает только student/teacher.
   */
  role: 'student' | 'teacher' | 'admin';
  name: string;
  grade: number | null;
  class_id: string | null;
}

export interface SchoolClass {
  name: string;
  code: string;
}

const CACHE_KEY = 'tanym.schoolProfile.v1';

/** Синхронное чтение прошлой роли — до первого кадра, без ожидания сети. */
function readCachedProfile(): SchoolProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SchoolProfile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: SchoolProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) window.localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    else window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // Приватный режим или переполненное хранилище — не повод ронять вход.
  }
}

interface SchoolAuthValue {
  loading: boolean;
  email: string | null;
  profile: SchoolProfile | null;
  schoolClass: SchoolClass | null;
  isSignedIn: boolean;
  refresh: () => Promise<void>;
  signInWithGoogle: (nextPath: string) => Promise<void>;
  signOut: () => Promise<void>;
  chooseRole: (
    role: 'student' | 'teacher',
    classCode?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

const SchoolAuthContext = createContext<SchoolAuthValue | null>(null);

export function SchoolAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  // Ленивый инициализатор: значение из localStorage попадает в самый первый
  // рендер, поэтому меню сразу рисуется под нужную роль.
  const [profile, setProfile] = useState<SchoolProfile | null>(readCachedProfile);
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setEmail(data.email ?? null);
      setProfile(data.profile ?? null);
      setSchoolClass(data.class ?? null);
      // Сеть — источник правды: если сессия кончилась, кэш обязан исчезнуть,
      // иначе меню продолжит показывать роль вышедшего пользователя.
      writeCachedProfile(data.profile ?? null);
    } catch {
      // Сеть отвалилась — оставляем то, что уже показано, и не мигаем.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION прилетает сразу при подписке и означает то же самое,
      // что и refresh() строкой выше — без этой проверки каждый заход
      // на страницу стоил бы двух одинаковых запросов подряд.
      // TOKEN_REFRESHED меняет только срок действия токена, профиль от этого
      // не меняется, перезапрашивать его незачем.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      refresh();
    });

    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<SchoolAuthValue>(() => {
    async function signInWithGoogle(nextPath: string) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
    }

    async function signOut() {
      const supabase = createClient();
      await supabase.auth.signOut();
      writeCachedProfile(null);
      setProfile(null);
      await refresh();
    }

    async function chooseRole(role: 'student' | 'teacher', classCode?: string) {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, classCode }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) await refresh();
      return { ok: res.ok, error: data?.error as string | undefined };
    }

    return {
      loading,
      email,
      profile,
      schoolClass,
      isSignedIn: email !== null,
      refresh,
      signInWithGoogle,
      signOut,
      chooseRole,
    };
  }, [loading, email, profile, schoolClass, refresh]);

  return <SchoolAuthContext.Provider value={value}>{children}</SchoolAuthContext.Provider>;
}

export function useSchoolAuth(): SchoolAuthValue {
  const context = useContext(SchoolAuthContext);
  if (!context) {
    throw new Error('useSchoolAuth вызван вне SchoolAuthProvider — провайдер стоит в app/layout.tsx');
  }
  return context;
}
