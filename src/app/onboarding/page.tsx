'use client';

/**
 * Онбординг — первая страница после входа новых учеников.
 * 
 * Выбор класса, предметов и цели обучения. Если профиль уже заполнен,
 * редирект на /dashboard автоматически.
 * 
 * Для учителей эта страница переправляет сразу на /teacher.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { Reveal, Spinner } from '@/components/motion';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, isSignedIn, loading } = useSchoolAuth();

  useEffect(() => {
    // Если профиль загружен и роль выбрана, переходим на нужную страницу
    if (!loading && profile) {
      // Учителя отправляем в /teacher
      if (profile.role === 'teacher') {
        router.replace('/teacher');
        return;
      }
      // Учеников отправляем в /dashboard (полный профиль уже заполнен)
      router.replace('/dashboard');
      return;
    }

    // Если не авторизован, отправляем на логин
    if (!loading && !isSignedIn) {
      router.replace('/login');
    }
  }, [profile, loading, isSignedIn, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900">
        <Reveal immediate>
          <div className="text-center">
            <Spinner />
            <p className="mt-4 text-white/60">Подготовка профиля...</p>
          </div>
        </Reveal>
      </div>
    );
  }

  // Этот компонент — только переходная страница. В будущем здесь можно
  // добавить полноценный онбординг с выбором класса, предметов и целей.
  // Сейчас все эти поля уже в /profile, поэтому просто переправляем дальше.
  return null;
}
