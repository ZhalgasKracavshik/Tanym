'use client';

/**
 * Школьный рейтинг.
 *
 * Экран решает конфликт: соревнование помогает одним и отталкивает других.
 * Поэтому анонимность стоит прямо здесь, а не в дальних настройках, — решение
 * принимается ровно в тот момент, когда ученик впервые видит себя в списке.
 * И формулировка честная: скрывается имя, а не участие.
 */

import { buildSchoolLeaderboard } from '@/data/leaderboard';
import { medalForRank, pseudonym, rankEntries } from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/lib/leaderboard';
import { summarize } from '@/lib/personalization';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Badge, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';

const TEXT: Dict<{
  title: string;
  subtitle: string;
  colRank: string;
  colStudent: string;
  colPoints: string;
  colTopics: string;
  colStreak: string;
  gradeLabel: (grade: number) => string;
  you: string;
  anonymityTitle: string;
  anonymityToggle: string;
  anonymityHelp: string;
  seenAs: (name: string) => string;
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  teacherNote: string;
  demoNote: string;
}> = {
  ru: {
    title: 'Рейтинг школы',
    subtitle: 'Очки начисляются за решённые задания. Быть в списке под именем — необязательно.',
    colRank: 'Место',
    colStudent: 'Ученик',
    colPoints: 'Очки',
    colTopics: 'Освоено тем',
    colStreak: 'Серия',
    gradeLabel: (grade) => `${grade} класс`,
    you: 'вы',
    anonymityTitle: 'Анонимный режим',
    anonymityToggle: 'Скрыть моё имя в рейтинге',
    anonymityHelp:
      'Одноклассники увидят псевдоним вместо имени. Очки продолжают начисляться, место сохраняется — из рейтинга вы не выпадаете.',
    seenAs: (name) => `Сейчас вас видят как «${name}».`,
    noProfileTitle: 'Вы пока вне рейтинга',
    noProfileText: 'Создайте профиль ученика и решите первые задания — строка появится сама.',
    createProfile: 'Создать профиль',
    teacherNote: 'Вы вошли как учитель: в ученический рейтинг ваша строка не добавляется.',
    demoNote:
      'В MVP нет общего сервера, поэтому одноклассники в таблице — демонстрационные данные. Настоящий прогресс считается только у вас.',
  },
  kk: {
    title: 'Мектеп рейтингі',
    subtitle: 'Ұпай шешілген тапсырмалар үшін беріледі. Тізімде өз атыңызбен тұру — міндетті емес.',
    colRank: 'Орын',
    colStudent: 'Оқушы',
    colPoints: 'Ұпай',
    colTopics: 'Меңгерілген тақырып',
    colStreak: 'Күн сериясы',
    gradeLabel: (grade) => `${grade} сынып`,
    you: 'сіз',
    anonymityTitle: 'Жасырын режим',
    anonymityToggle: 'Рейтингте атымды жасыру',
    anonymityHelp:
      'Сыныптастар атыңыздың орнына бүркеншік атты көреді. Ұпай бұрынғыдай есептеледі, орныңыз сақталады — рейтингтен шығып қалмайсыз.',
    seenAs: (name) => `Қазір сізді «${name}» деп көреді.`,
    noProfileTitle: 'Сіз әзірге рейтингте жоқсыз',
    noProfileText: 'Оқушы профилін құрып, алғашқы тапсырмаларды шешіңіз — жолыңыз өзі пайда болады.',
    createProfile: 'Профиль құру',
    teacherNote: 'Сіз мұғалім ретінде кірдіңіз: оқушылар рейтингіне сіздің жолыңыз қосылмайды.',
    demoNote:
      'MVP-де ортақ сервер жоқ, сондықтан кестедегі сыныптастар — көрсетілім деректері. Нақты прогресс тек сізде есептеледі.',
  },
  en: {
    title: 'School leaderboard',
    subtitle: 'Points come from solved tasks. Appearing under your real name is optional.',
    colRank: 'Place',
    colStudent: 'Student',
    colPoints: 'Points',
    colTopics: 'Topics mastered',
    colStreak: 'Streak',
    gradeLabel: (grade) => `grade ${grade}`,
    you: 'you',
    anonymityTitle: 'Anonymous mode',
    anonymityToggle: 'Hide my name in the leaderboard',
    anonymityHelp:
      'Classmates will see a pseudonym instead of your name. Points keep adding up and your place stays — you do not drop out of the ranking.',
    seenAs: (name) => `Others currently see you as “${name}”.`,
    noProfileTitle: 'You are not in the ranking yet',
    noProfileText: 'Create a student profile and solve your first tasks — your row will appear on its own.',
    createProfile: 'Create profile',
    teacherNote: 'You are signed in as a teacher, so your row is not added to the student ranking.',
    demoNote:
      'The MVP has no shared server, so the classmates in this table are demo data. Only your own progress is real.',
  },
};

export default function LeaderboardPage() {
  const { state, hydrated, setLeaderboardAnonymous } = useStore();
  const t = TEXT[state.language];

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const profile = state.profile;
  const isStudent = profile !== null && profile.role === 'student';
  const summary = summarize(state);

  // Строка текущего пользователя собирается из его реального прогресса,
  // а не хранится в данных: очки и темы считает движок персонализации.
  const me: LeaderboardEntry | null =
    profile && isStudent
      ? {
          id: profile.id,
          name: profile.name,
          grade: profile.grade,
          points: summary.points,
          topicsMastered: summary.topicsMastered,
          streak: state.streak.current,
          isCurrentUser: true,
          anonymous: state.leaderboardAnonymous,
        }
      : null;

  const rows = rankEntries(me ? [...buildSchoolLeaderboard(), me] : buildSchoolLeaderboard());

  /** Что видят остальные: настоящее имя или псевдоним. */
  const visibleName = (entry: LeaderboardEntry): string =>
    entry.anonymous ? pseudonym(entry.id, state.language) : entry.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t.title}</h1>
      <p className="mt-2 text-ink-500">{t.subtitle}</p>

      {/* Переключатель анонимности — рядом с таблицей, а не в настройках */}
      {me ? (
        <Card className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-400">{t.anonymityTitle}</p>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={state.leaderboardAnonymous}
              onChange={(event) => setLeaderboardAnonymous(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 accent-brand-500"
            />
            <span>
              <span className="font-semibold text-ink-900">{t.anonymityToggle}</span>
              <span className="mt-1 block text-sm text-ink-500">{t.anonymityHelp}</span>
            </span>
          </label>
          <p className="mt-3 text-sm text-ink-600">
            {t.seenAs(visibleName(me))}
          </p>
        </Card>
      ) : profile ? (
        <div className="mt-6">
          <Card>
            <p className="text-sm text-ink-600">{t.teacherNote}</p>
          </Card>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon="🏁"
            title={t.noProfileTitle}
            description={t.noProfileText}
            action={<ButtonLink href="/onboarding">{t.createProfile}</ButtonLink>}
          />
        </div>
      )}

      {/* Таблица прокручивается вбок отдельно от страницы — иначе на телефоне
          пять колонок растянули бы весь макет */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-sm">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
              <th scope="col" className="px-4 py-3">
                {t.colRank}
              </th>
              <th scope="col" className="px-4 py-3">
                {t.colStudent}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t.colPoints}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t.colTopics}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t.colStreak}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const medal = medalForRank(entry.rank);

              return (
                <tr
                  key={entry.id}
                  className={`border-b border-ink-100 last:border-b-0 ${
                    entry.isCurrentUser ? 'bg-brand-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-bold tabular-nums text-ink-900">
                      {medal && (
                        <span aria-hidden className="text-base">
                          {medal}
                        </span>
                      )}
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`block font-semibold ${
                        entry.isCurrentUser ? 'text-brand-700' : 'text-ink-900'
                      }`}
                    >
                      {visibleName(entry)}
                      {entry.isCurrentUser && (
                        <Badge tone="brand" className="ml-2 align-middle">
                          {t.you}
                        </Badge>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-400">{t.gradeLabel(entry.grade)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-ink-900">{entry.points}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-600">{entry.topicsMastered}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-600">
                    <span aria-hidden>🔥</span> {entry.streak}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Честное примечание: лучше сказать про демо-данные прямо,
          чем оставить ученика гадать, откуда взялись одноклассники */}
      <p className="mt-4 text-sm text-ink-400">{t.demoNote}</p>
    </div>
  );
}
