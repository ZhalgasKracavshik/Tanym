'use client';

/**
 * Люди школы: кто есть и с какой ролью.
 *
 * Роль меняется не обычным UPDATE, а вызовом admin_set_role в базе. Право
 * писать в колонку role не выдано никому из вошедших намеренно: иначе
 * ученик присвоил бы себе админа одной строкой в консоли браузера. Функция
 * сама проверяет, что вызывающий — администратор, и отказывается снимать
 * роль с последнего из них, иначе школа осталась бы без модерации.
 *
 * Удаления пользователя здесь нет. Удалить ученика — значит потерять его
 * портфолио, прогресс и его записи в чужих лентах; для школы это почти
 * всегда не то, что нужно, а нужно «перевести» или «выпустить». Пока такой
 * операции нет, лучше не давать кнопку, которая делает необратимое не то.
 */

import { Suspense, useState } from 'react';
import { useStore } from '@/components/StoreProvider';
import { SchoolAuthGate } from '@/components/SchoolAuthGate';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { createClient } from '@/lib/supabase/client';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';
import { Avatar } from '@/components/Avatar';
import { Alert, Badge, Skeleton } from '@/components/ui';
import { AdminShell, Section, useRows } from '../parts';

const ROLE_LABEL: Record<string, string> = {
  student: 'Ученик',
  teacher: 'Учитель',
  admin: 'Администратор',
};

const ROLES = ['student', 'teacher', 'admin'] as const;

function UsersPanel() {
  const { profile: me } = useSchoolAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  /*
    Класс подтягивается связью, а не вторым запросом: подпись раздела в
    навигации обещает «роли, классы и участники», а класс — то, по чему
    администратор ищет человека в первую очередь («кто у нас в 10Б»).
  */
  const users = useRows(
    'profiles',
    'id, name, role, grade, avatar_color, avatar_emoji, avatar_photo_path, classes(name)',
    refreshKey,
  );

  async function setRole(id: string, role: string) {
    setBusyId(id);
    setError(null);
    const { error: rpcError } = await createClient().rpc('admin_set_role', {
      target_id: id,
      new_role: role,
    });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setRefreshKey((key) => key + 1);
  }

  /*
    Поиск идёт и по имени, и по классу: администратор чаще ищет «весь 10Б»,
    чем конкретного человека по фамилии.
  */
  const needle = query.trim().toLowerCase();
  const filtered = (users ?? []).filter((row) => {
    const haystack = [
      String(row.name ?? ''),
      (row.classes as { name?: string } | null)?.name ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });

  return (
    <div>
      {error && (
        <div className="mb-6">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-ink-800">Поиск</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Имя или класс"
          className="mt-2 w-full rounded-[var(--radius-control)] border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors duration-150 focus:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500"
        />
      </label>

      <Section title={`Участники${users ? ` · ${users.length}` : ''}`}>
        {users === null ? (
          <Skeleton className="h-24 w-full" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-ink-500">Никого не нашлось.</p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {filtered.map((row) => {
              const role = String(row.role);
              const isMe = row.id === me?.id;
              // Связь приходит объектом, а у учеников без класса — null.
              const className = (row.classes as { name?: string } | null)?.name ?? '';

              return (
                <li key={row.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar
                    name={String(row.name ?? '')}
                    colorId={row.avatar_color as string | null}
                    emoji={row.avatar_emoji as string | null}
                    photoUrl={avatarPhotoUrl(row.avatar_photo_path as string | null)}
                    size={36}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">
                      {String(row.name ?? 'Без имени')}
                      {isMe && (
                        <Badge tone="brand" className="ml-2 align-middle">
                          вы
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-ink-400">
                      {ROLE_LABEL[role] ?? role}
                      {row.grade ? ` · ${String(row.grade)} класс` : ''}
                      {className ? ` · ${className}` : ''}
                    </p>
                  </div>

                  {/*
                    Свою роль сменить нельзя: администратор, случайно
                    разжаловавший сам себя, теряет доступ к этой же странице
                    и вернуть его сможет только через SQL.
                  */}
                  {isMe ? (
                    <span className="text-xs text-ink-400">свою роль менять нельзя</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES.map((option) => (
                        <button
                          key={option}
                          disabled={busyId === row.id || role === option}
                          onClick={() => setRole(row.id, option)}
                          className={`rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold transition-all duration-150 disabled:cursor-default focus-visible:ring-2 focus-visible:ring-brand-500 ${
                            role === option
                              ? 'border-brand-300 bg-brand-50 text-brand-700'
                              : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200 hover:text-brand-600 disabled:opacity-50'
                          }`}
                        >
                          {ROLE_LABEL[option]}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

export default function AdminUsersPage() {
  const { state } = useStore();

  return (
    <AdminShell title="Люди" description="Участники школы и их роли.">
      <Suspense fallback={null}>
        <SchoolAuthGate requireRole="admin" language={state.language}>
          {() => <UsersPanel />}
        </SchoolAuthGate>
      </Suspense>
    </AdminShell>
  );
}
