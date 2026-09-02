'use client';

/**
 * Школьный рейтинг.
 *
 * Экран решает конфликт: соревнование помогает одним и отталкивает других.
 * Поэтому анонимность стоит прямо здесь, а не в дальних настройках, — решение
 * принимается ровно в тот момент, когда ученик впервые видит себя в списке.
 * И формулировка честная: скрывается имя, а не участие.
 */

import { useState } from 'react';
import { pseudonym, rankEntries } from '@/lib/leaderboard';
import type { LeaderboardEntry } from '@/lib/leaderboard';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useOwnStreakPoints, useSchoolLeaderboard, useVerifiedProgress } from '@/lib/supabase/leaderboard';
import { portfolioPoints, usePortfolio } from '@/components/Portfolio';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import { TIER_LABEL, levelFromPoints } from '@/lib/level';
import type { LevelTier } from '@/lib/level';
import { Badge, ButtonLink, EmptyState, Panel, Skeleton } from '@/components/ui';
import { avatarPhotoUrl } from '@/lib/supabase/avatarPhoto';

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
  levelWord: string;
  colPoints: string;
  colTopics: string;
  colStreak: string;
  gradeLabel: (grade: number) => string;
  you: string;
  noProfileTitle: string;
  noProfileText: string;
  createProfile: string;
  teacherNote: string;
}> = {
  ru: {
    title: 'Рейтинг школы',
    myPlace: 'Ваше место',
    participants: 'Участников',
    topScore: 'Лучший результат',
    colRank: 'Место',
    colStudent: 'Ученик',
    levelWord: 'Уровень',
    colPoints: 'Очки',
    colTopics: 'Освоено тем',
    colStreak: 'Серия',
    gradeLabel: (grade) => `${grade} класс`,
    you: 'вы',
    noProfileTitle: 'Вы пока вне рейтинга',
    noProfileText: 'Создайте профиль ученика, решите первые задания или добавьте достижение в портфолио — строка появится сама.',
    createProfile: 'Создать профиль',
    teacherNote: 'Рейтинг ведут ученики. Вы видите весь список целиком — баллы и уровни начисляются только ученикам.',
  },
  kk: {
    title: 'Мектеп рейтингі',
    myPlace: 'Сіздің орныңыз',
    participants: 'Қатысушы',
    topScore: 'Үздік нәтиже',
    colRank: 'Орын',
    colStudent: 'Оқушы',
    levelWord: 'Деңгей',
    colPoints: 'Ұпай',
    colTopics: 'Меңгерілген тақырып',
    colStreak: 'Күн сериясы',
    gradeLabel: (grade) => `${grade} сынып`,
    you: 'сіз',
    noProfileTitle: 'Сіз әзірге рейтингте жоқсыз',
    noProfileText: 'Оқушы профилін құрып, алғашқы тапсырмаларды шешіңіз, сонда жолыңыз өзі пайда болады.',
    createProfile: 'Профиль құру',
    teacherNote: 'Рейтингті оқушылар жүргізеді. Сіз тізімді толық көресіз — ұпайлар мен деңгейлер тек оқушыларға беріледі.',
  },
  en: {
    title: 'School leaderboard',
    myPlace: 'Your place',
    participants: 'Participants',
    topScore: 'Top score',
    colRank: 'Place',
    colStudent: 'Student',
    levelWord: 'Level',
    colPoints: 'Points',
    colTopics: 'Topics mastered',
    colStreak: 'Streak',
    gradeLabel: (grade) => `grade ${grade}`,
    you: 'you',
    noProfileTitle: 'You are not in the ranking yet',
    noProfileText: 'Create a student profile and solve your first tasks, and your row will appear on its own.',
    createProfile: 'Create profile',
    teacherNote: 'The ranking belongs to students. You see the full list — points and levels are awarded to students only.',
  },
};


const TIER_STYLE: Record<LevelTier, string> = {
  bronze: 'bg-[#f2e3d5] text-[#8a5a30]',
  silver: 'bg-[#e6ebef] text-[#5b6b78]',
  gold: 'bg-[#fbeaba] text-[#8a6a00]',
  platinum: 'bg-[#e3ecf6] text-[#3f6690]',
  diamond: 'bg-[#dff1f6] text-[#1f7b93]',
};

export default function LeaderboardPage() {
  const [visibleCount, setVisibleCount] = useState(10);
  const { state, hydrated } = useStore();
  const { profile: schoolProfile } = useSchoolAuth();
  const realEntries = useSchoolLeaderboard(schoolProfile?.id ?? null);
  const myAchievements = usePortfolio(schoolProfile?.id ?? null);
  const myAchievementPoints = portfolioPoints(myAchievements);
  const myStreakPoints = useOwnStreakPoints(schoolProfile?.id ?? null);
  const myVerified = useVerifiedProgress(schoolProfile?.id ?? null);
  const t = TEXT[state.language];

  if (!hydrated || realEntries === null) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  /*
    Ученик определяется по школьному аккаунту, а не по локальному профилю.
    Раньше проверялся state.profile, и вошедший ученик, не проходивший
    онбординг в этом браузере, просто не попадал в рейтинг — хотя его
    баллы за достижения уже лежали в базе.
  */
  const profile = state.profile;
  const isStudent = schoolProfile?.role === 'student';

  // Строка текущего пользователя собирается из его реального прогресса,
  // а не хранится в данных: очки и темы считает движок персонализации.
  const me: LeaderboardEntry | null =
    schoolProfile && isStudent
      ? {
          // Свой Supabase id — тогда строка из базы (может ещё не успеть
          // обновиться за 4 секунды ProgressSync) не задвоится со свежей,
          // посчитанной прямо сейчас.
          id: schoolProfile.id,
          name: schoolProfile.name,
          grade: (schoolProfile.grade ?? profile?.grade ?? 0) as LeaderboardEntry['grade'],
          // Своя строка собирается здесь, а не приходит из общего запроса,
          // поэтому оформление аватара нужно перенести явно — иначе у всех
          // символ на месте, а у себя почему-то буква.
          avatarColor: schoolProfile.avatar_color,
          avatarPhoto: avatarPhotoUrl(schoolProfile.avatar_photo_path),
          // Свои баллы складываются из тех же трёх источников, что и у
          // остальных строк (задания + подтверждённые достижения + бонусы
          // за серии), иначе собственное место считалось бы по другим
          // правилам, чем чужие.
          points: myVerified.points + myAchievementPoints + myStreakPoints,
          topicsMastered: myVerified.topicsMastered,
          streak: myVerified.streak,
          isCurrentUser: true,
          anonymous: schoolProfile.leaderboard_anonymous,
        }
      : null;

  const rows = rankEntries(me ? [...realEntries, me] : realEntries);

  /*
    Список показывается порциями.

    Школа — это сотни строк, и вываливать их разом значит сделать страницу
    длиной в лифт: своё место всё равно ищут через выделенную строку, а
    остальное листают. Порция в десять — столько, сколько помещается на
    экран, не заставляя прокручивать ради следующей.
  */
  const visibleRows = rows.slice(0, visibleCount);
  const hasMore = rows.length > visibleRows.length;

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
      {/*
        Подиум для первой тройки.

        Таблица одинаковых строк не отличает победителя от восьмого места:
        разница только в цифре слева, и взгляд её не выхватывает. Подиум
        делает первую тройку событием, ради которого в рейтинг и заходят.
        Колонки намеренно разной высоты — порядок читается формой, а не
        только числом.

        Показывается, только если в рейтинге есть кого показывать: подиум
        с одним человеком выглядит насмешкой.
      */}
      {rows.length >= 3 && (
        <div className="mt-10 grid grid-cols-3 items-end gap-2 sm:gap-4">
          {[rows[1], rows[0], rows[2]].map((entry) => {
            const isWinner = entry.rank === 1;
            const height = entry.rank === 1 ? 'h-28 sm:h-36' : entry.rank === 2 ? 'h-20 sm:h-28' : 'h-16 sm:h-24';
            const tone =
              entry.rank === 1
                ? 'var(--gradient-brand)'
                : entry.rank === 2
                  ? 'linear-gradient(135deg, #d3e0e8, #a8bcc8)'
                  : 'linear-gradient(135deg, #f6c0a8, #e57545)';

            return (
              <div key={entry.id} className="flex flex-col items-center">
                <Avatar
                  name={visibleName(entry)}
                  colorId={entry.anonymous ? 'slate' : entry.avatarColor}
                  photoUrl={entry.anonymous ? null : entry.avatarPhoto}
                  size={isWinner ? 64 : 52}
                  className={isWinner ? 'ring-2 ring-accent-400 ring-offset-2' : ''}
                />
                <p className="mt-2 line-clamp-1 max-w-full text-center text-xs font-bold text-ink-900 sm:text-sm">
                  {visibleName(entry)}
                </p>
                <p className="text-xs font-semibold tabular-nums text-brand-600">{entry.points}</p>

                <div
                  className={`mt-2 flex w-full items-start justify-center rounded-t-[var(--radius-control)] pt-3 ${height}`}
                  style={{ background: tone }}
                >
                  <span className="text-lg font-bold tabular-nums text-white drop-shadow">
                    {entry.rank}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            {visibleRows.map((entry) => {
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
                      {/* У первого места корона, у второго и третьего медаль:
                          отличать лидера от призёров одинаковым значком
                          значит не отличать их вовсе. */}
                      {entry.rank === 1 ? (
                        <Icon name="crown" size={19} className={medalTone} />
                      ) : (
                        medalTone && <Icon name="medal" size={18} className={medalTone} />
                      )}
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {/*
                      Аватар и уровень, а не одна строка имени.

                      В таблице из одинаковых строк ученик ищет себя глазами
                      по имени — это медленно. Цветной кружок находится
                      быстрее, а уровень отвечает на вопрос, который место в
                      списке не отвечает: тот, кто стоит двадцатым, всё равно
                      видит, что он вырос.
                    */}
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={visibleName(entry)}
                        colorId={entry.anonymous ? 'slate' : entry.avatarColor}
                        photoUrl={entry.anonymous ? null : entry.avatarPhoto}
                        size={36}
                      />
                      <div className="min-w-0">
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
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-bold ${
                              TIER_STYLE[levelFromPoints(entry.points).tier]
                            }`}
                          >
                            {`${t.levelWord} ${levelFromPoints(entry.points).level} · ${
                              TIER_LABEL[levelFromPoints(entry.points).tier]
                            }`}
                          </span>
                          {/*
                            Класс показываем, только если он known. У админа и
                            у не заполнившего профиль в базе стоит null, из
                            которого в тип Grade приходил ноль, — и в списке
                            висело «0 класс». Ноль здесь не значение, а
                            отсутствие значения, и печатать его нельзя.
                          */}
                          {entry.grade > 0 && (
                            <span className="text-xs tabular-nums text-ink-400">
                              {t.gradeLabel(entry.grade)}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
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

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setVisibleCount((count) => count + 10)}
            className="rounded-[var(--radius-control)] border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-600 transition-all duration-150 hover:border-brand-300 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            Показать ещё 10 · осталось {rows.length - visibleRows.length}
          </button>
        </div>
      )}

      {/*
        Настройка анонимности отсюда убрана — она живёт в настройках.

        Флажок с абзацем пояснения под таблицей перебивал собой сам
        рейтинг: страницу открывают, чтобы увидеть места, а не чтобы
        настраивать видимость. Строка ниже сообщает, как ученика видят
        сейчас, и ведёт туда, где это меняется, — этого достаточно.
      */}
      {/*
        Ученику внизу страницы ничего не дописываем: рейтинг заканчивается
        таблицей. Настройка видимости живёт в настройках, объяснение того,
        как считаются баллы, — в справке рядом с самими баллами.
      */}
      {/*
        Ветку выбираем по роли, а не по наличию локального профиля.

        Раньше здесь стоял state.profile — локальная анкета, которую
        заполняет только ученик в онбординге. У учителя её нет и быть не
        должно, поэтому он проваливался в ветку «создайте профиль ученика»
        и получал кнопку в мастер, который тут же разворачивает его
        обратно в свою панель. Роль отвечает на этот вопрос прямо.
      */}
      {me ? null : !isStudent ? (

        /*
          Учителю — спокойная карточка, а не строка-оправдание внизу страницы.

          Раньше здесь висело «ваша строка не добавляется»: фраза объясняла
          через отрицание и читалась как отказ, хотя учитель ничего не терял.
          Смысл обратный: список он видит целиком, просто соревнуются в нём
          ученики.
        */
        <div className="mt-16 flex items-start gap-4 rounded-[var(--radius-card)] border border-ink-200 bg-white p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-brand-50 text-brand-600">
            <Icon name="cap" size={20} />
          </span>
          <p className="text-sm leading-relaxed text-ink-600">{t.teacherNote}</p>
        </div>
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

    </div>
  );
}
