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
 * Откуда берётся роль в первом кадре. Раньше здесь был кэш в localStorage,
 * и он не решал задачу: во время серверного рендера localStorage не
 * существует, поэтому сервер ВСЕГДА отдавал разметку с ролью null (то есть
 * с полным меню), браузер её рисовал, и через секунду гидратация подменяла
 * меню — то самое мигание. Теперь профиль приходит пропсами из layout,
 * который читает его на сервере из куки сессии: серверный и первый
 * клиентский рендер видят одно и то же значение, подменять нечего.
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
  avatar_color: string | null;
  social_links: unknown;
  subject_ids: string[] | null;
  goal: string | null;
  target_date: string | null;
}

export interface SchoolClass {
  name: string;
  code: string;
}

export type OAuthProvider = 'google' | 'apple';

interface SchoolAuthValue {
  loading: boolean;
  email: string | null;
  profile: SchoolProfile | null;
  schoolClass: SchoolClass | null;
  isSignedIn: boolean;
  refresh: () => Promise<void>;
  signInWithProvider: (provider: OAuthProvider, nextPath: string) => Promise<void>;
  /** Оставлено ради существующих вызовов; внутри — signInWithProvider('google'). */
  signInWithGoogle: (nextPath: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  chooseRole: (
    role: 'student' | 'teacher',
    classCode?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
}

const SchoolAuthContext = createContext<SchoolAuthValue | null>(null);

export function SchoolAuthProvider({
  children,
  initialProfile = null,
  initialEmail = null,
  initialSchoolClass = null,
}: {
  children: ReactNode;
  initialProfile?: SchoolProfile | null;
  initialEmail?: string | null;
  initialSchoolClass?: SchoolClass | null;
}) {
  /*
    loading стартует с false: профиль уже пришёл с сервера, ждать нечего.
    Если оставить true, каждый SchoolAuthGate вернул бы null на первом кадре
    и вместо мигающего меню получилось бы мигающее пустое место.
  */
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(initialEmail);
  const [profile, setProfile] = useState<SchoolProfile | null>(initialProfile);
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(initialSchoolClass);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      setEmail(data.email ?? null);
      setProfile(data.profile ?? null);
      setSchoolClass(data.class ?? null);
    } catch {
      // Сеть отвалилась — оставляем то, что уже показано, и не мигаем.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /*
      refresh() при монтировании больше не вызывается: профиль уже пришёл
      с сервера тем же запросом, что и HTML. Лишний вызов не только тратил
      бы запрос, но и дёргал loading в true и обратно — а на это состояние
      завязаны ворота публикации, и они успевали моргнуть пустотой.

      Перезапрос остаётся на реальные события: вход, выход, смена
      пользователя. INITIAL_SESSION и TOKEN_REFRESHED к ним не относятся —
      первое дублирует то, что уже есть, второе меняет только срок токена.
    */
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      refresh();
    });

    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<SchoolAuthValue>(() => {
    async function signInWithProvider(provider: OAuthProvider, nextPath: string) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
    }

    async function signInWithGoogle(nextPath: string) {
      await signInWithProvider('google', nextPath);
    }

    async function signInWithPassword(emailValue: string, password: string) {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: emailValue, password });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    }

    async function signUpWithPassword(emailValue: string, password: string, name: string) {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password,
        // Имя кладём в метаданные пользователя: /api/profile берёт его оттуда
        // при создании профиля, ровно как для входа через Google.
        options: { data: { full_name: name } },
      });
      if (error) return { ok: false, error: error.message };

      // Если подтверждение почты включено, сессии сразу не будет — и это
      // не ошибка, а другой сценарий: человеку нужно сходить в почту.
      const needsConfirmation = !data.session;
      if (!needsConfirmation) await refresh();
      return { ok: true, needsConfirmation };
    }

    async function sendPasswordReset(emailValue: string) {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    async function updatePassword(password: string) {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    }

    async function signOut() {
      const supabase = createClient();
      await supabase.auth.signOut();
      setProfile(null);
      setEmail(null);
      setSchoolClass(null);
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
      signInWithProvider,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      sendPasswordReset,
      updatePassword,
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
