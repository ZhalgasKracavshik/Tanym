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
import { pseudonym, rankEntries } from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/lib/leaderboard';
import { summarize } from '@/lib/personalization';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Icon } from '@/components/Icon';
import { Badge, ButtonLink, EmptyState, Panel, Skeleton } from '@/components/ui';

/**
 * Цвет медали для первых трёх мест. Место всё равно показано числом, медаль
 * лишь помогает выхватить тройку взглядом, поэтому дальше третьего места её нет.
 */
const MEDAL_TONE: Record<number, string> = {
  1: 'text-accent-500',
  2: 'text-ink-400',
  3: 'text-subject-history',
};

const TEXT: Dict<{
  title: string;
  myPlace: string;
  participants: string;
  topScore: string;
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
    myPlace: 'Ваше место',
    participants: 'Участников',
    topScore: 'Лучший результат',
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
      'Одноклассники увидят псевдоним вместо имени. Очки продолжают начисляться, место сохраняется, из рейтинга вы не выпадаете.',
    seenAs: (name) => `Сейчас вас видят как «${name}».`,
    noProfileTitle: 'Вы пока вне рейтинга',
    noProfileText: 'Создайте профиль ученика и решите первые задания, тогда строка появится сама.',
    createProfile: 'Создать профиль',
    teacherNote: 'Вы вошли как учитель: в ученический рейтинг ваша строка не добавляется.',
    demoNote:
      'В MVP нет общего сервера, поэтому одноклассники в таблице показаны демонстрационными данными. Настоящий прогресс считается только у вас.',
  },
  kk: {
    title: 'Мектеп рейтингі',
    myPlace: 'Сіздің орныңыз',
    participants: 'Қатысушы',
    topScore: 'Үздік нәтиже',
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
      'Сыныптастар атыңыздың орнына бүркеншік атты көреді. Ұпай бұрынғыдай есептеледі, орныңыз сақталады, рейтингтен шығып қалмайсыз.',
    seenAs: (name) => `Қазір сізді «${name}» деп көреді.`,
    noProfileTitle: 'Сіз әзірге рейтингте жоқсыз',
    noProfileText: 'Оқушы профилін құрып, алғашқы тапсырмаларды шешіңіз, сонда жолыңыз өзі пайда болады.',
    createProfile: 'Профиль құру',
    teacherNote: 'Сіз мұғалім ретінде кірдіңіз: оқушылар рейтингіне сіздің жолыңыз қосылмайды.',
    demoNote:
      'MVP-де ортақ сервер жоқ, сондықтан кестедегі сыныптастар көрсетілім деректері болып табылады. Нақты прогресс тек сізде есептеледі.',
  },
  en: {
    title: 'School leaderboard',
    myPlace: 'Your place',
    participants: 'Participants',
    topScore: 'Top score',
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
      'Classmates will see a pseudonym instead of your name. Points keep adding up and your place stays, so you do not drop out of the ranking.',
    seenAs: (name) => `Others currently see you as “${name}”.`,
    noProfileTitle: 'You are not in the ranking yet',
    noProfileText: 'Create a student profile and solve your first tasks, and your row will appear on its own.',
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

  // Строка текущего ученика уже с посчитанным местом: она же главный элемент экрана.
  const myRow = rows.find((entry) => entry.isCurrentUser) ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/*
        Заголовок без описания: ученик приходит сюда за своим местом, а не
        за объяснением, что такое рейтинг. Сразу под заголовком идут цифры.
      */}
      <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">{t.title}</h1>

      {/*
        Показатели лежат на голом фоне между волосяными линиями. Место набрано
        крупнее всего: остальные цифры это подробности того же самого места.
      */}
      <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-ink-200 py-6 sm:grid-cols-4 sm:divide-x sm:divide-ink-200">
        {myRow ? (
          <>
            <div className="sm:pr-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.myPlace}</p>
              <p className="mt-2 text-5xl font-semibold tabular-nums text-ink-900">{myRow.rank}</p>
            </div>
            <div className="sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.colPoints}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{myRow.points}</p>
            </div>
            <div className="sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.colTopics}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{myRow.topicsMastered}</p>
            </div>
            <div className="sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.colStreak}</p>
              <p className="mt-2 flex items-center gap-1.5 text-2xl font-semibold tabular-nums text-ink-900">
                <Icon
                  name="flame"
                  size={20}
                  className={myRow.streak > 0 ? 'text-accent-500' : 'text-ink-300'}
                />
                {myRow.streak}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="sm:pr-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.participants}</p>
              <p className="mt-2 text-5xl font-semibold tabular-nums text-ink-900">{rows.length}</p>
            </div>
            <div className="sm:px-8">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.topScore}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">{rows[0]?.points ?? 0}</p>
            </div>
          </>
        )}
      </div>

      {/*
        Таблица лежит в панели, а не в карточке: у карточки тень и радиус,
        которые обещают самодостаточный объект, а таблица это плотные данные.
        Прокручивается вбок отдельно от страницы — иначе на телефоне пять
        колонок растянули бы весь макет.
      */}
      <Panel className="mt-10 overflow-x-auto">
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
              const medalTone = MEDAL_TONE[entry.rank];

              return (
                /*
                  Своя строка выделена фоном и полосой слева, а рядом стоит слово
                  «вы»: по одному фону ученик не обязан догадываться, что это он.
                */
                <tr
                  key={entry.id}
                  className={`border-b border-ink-100 transition-colors duration-150 last:border-b-0 ${
                    entry.isCurrentUser ? 'bg-brand-50' : 'hover:bg-ink-50'
                  }`}
                >
                  <td
                    className={`px-4 py-3 ${
                      entry.isCurrentUser ? 'border-l-[3px] border-brand-500 pl-[13px]' : ''
                    }`}
                  >
                    <span
                      className={`flex items-center gap-2 tabular-nums ${
                        entry.isCurrentUser
                          ? 'text-xl font-semibold text-brand-700'
                          : 'font-bold text-ink-900'
                      }`}
                    >
                      {medalTone && <Icon name="medal" size={18} className={medalTone} />}
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
                    <span className="mt-0.5 block text-xs tabular-nums text-ink-400">
                      {t.gradeLabel(entry.grade)}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${
                      entry.isCurrentUser ? 'text-xl font-semibold text-brand-700' : 'font-bold text-ink-900'
                    }`}
                  >
                    {entry.points}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-600">{entry.topicsMastered}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-600">
                    <span className="flex items-center justify-end gap-2">
                      <Icon name="flame" size={16} className="text-accent-500" />
                      {entry.streak}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {/*
        Всё, что не таблица, ушло вниз в отдельную область: переключатель
        анонимности это настройка, а не данные, и над таблицей он перебивал
        собой главное. Решение всё равно принимается здесь, а не в дальних
        настройках, — сразу после того, как ученик увидел себя в списке.
      */}
      {me ? (
        <div className="mt-16 border-t border-ink-200 pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{t.anonymityTitle}</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={state.leaderboardAnonymous}
              onChange={(event) => setLeaderboardAnonymous(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-ink-300 accent-brand-500"
            />
            <span>
              <span className="font-semibold text-ink-900">{t.anonymityToggle}</span>
              <span className="mt-2 block text-sm text-ink-500">{t.anonymityHelp}</span>
            </span>
          </label>
          <p className="mt-2 text-sm text-ink-600">{t.seenAs(visibleName(me))}</p>
        </div>
      ) : profile ? (
        <p className="mt-16 border-t border-ink-200 pt-6 text-sm text-ink-600">{t.teacherNote}</p>
      ) : (
        <div className="mt-16">
          {/* Иконка вынесена рядом: проп icon в EmptyState принимает строку,
              а строкой иконку из набора не передать. */}
          <div className="mb-3 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-200 bg-white text-ink-400">
              <Icon name="trophy" size={24} />
            </span>
          </div>
          <EmptyState
            title={t.noProfileTitle}
            description={t.noProfileText}
            action={<ButtonLink href="/onboarding">{t.createProfile}</ButtonLink>}
          />
        </div>
      )}

      {/* Честное примечание: лучше сказать про демо-данные прямо,
          чем оставить ученика гадать, откуда взялись одноклассники */}
      <p className="mt-4 text-sm text-ink-400">{t.demoNote}</p>
    </div>
  );
}
