'use client';

/**
 * Состояние входа через школьный аккаунт Google.
 *
 * Три состояния, а не два: гость (можно всё смотреть), вошёл без профиля
 * (сессия есть, роль ещё не выбрана — окно между OAuth-редиректом и
 * ответом на «ты ученик или учитель»), вошёл с профилем (можно публиковать).
 */

import { useCallback, useEffect, useState } from 'react';
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

export function useSchoolAuth() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/profile');
    const data = await res.json();
    setEmail(data.email ?? null);
    setProfile(data.profile ?? null);
    setSchoolClass(data.class ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  async function signInWithGoogle(nextPath: string) {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}` },
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
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
    signInWithGoogle,
    signOut,
    chooseRole,
    isSignedIn: email !== null,
  };
}
