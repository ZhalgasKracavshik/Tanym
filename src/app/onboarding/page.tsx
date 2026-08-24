'use client';

/**
 * Устаревший адрес онбординга.
 *
 * Класс, предметы и цель обучения теперь заполняются на /profile — там же,
 * где их потом и правят. Все действующие ссылки в приложении уже ведут
 * туда напрямую; этот маршрут остаётся только ради старых закладок и
 * ссылок, отправленных до переноса, и просто передаёт человека дальше.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { Reveal, Spinner } from '@/components/motion';

export default function OnboardingPage() {
  const router = useRouter();
  const { isSignedIn, loading } = useSchoolAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(isSignedIn ? '/profile' : '/login');
  }, [isSignedIn, loading, router]);

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
