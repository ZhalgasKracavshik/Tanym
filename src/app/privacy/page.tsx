/**
 * Что Tanym собирает и что с этим делает.
 *
 * Страница написана буквально по тому, что лежит в базе, а не по
 * шаблону политики конфиденциальности. Причина простая: продуктом
 * пользуются несовершеннолетние, и текст, обещающий больше или меньше
 * реального, хуже отсутствия текста — по нему нельзя проверить.
 *
 * Каждый пункт ниже соответствует конкретной таблице или колонке. Если
 * что-то в продукте изменится, эта страница обязана измениться вместе с
 * ним, иначе она превращается в украшение.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Данные учеников — Tanym',
  description: 'Что Tanym хранит об ученике, что не хранит и кто это видит.',
};

const COLLECTED = [
  {
    what: 'Имя и почта',
    why: 'Вход в аккаунт и подпись в школьном рейтинге. Имя можно скрыть — в рейтинге останется псевдоним.',
  },
  {
    what: 'Класс, предметы и учебная цель',
    why: 'По ним строится персональный план: без класса и предметов движок не может отобрать темы.',
  },
  {
    what: 'Решённые задания: какое, когда, верно или нет',
    why: 'Из них считается владение навыком и место в рейтинге. Сам текст ответа не сохраняется — для расчёта он не нужен.',
  },
  {
    what: 'Достижения портфолио, которые ученик добавил сам',
    why: 'Олимпиады и конкурсы. Публикуются только после проверки школой.',
  },
];

const NOT_COLLECTED = [
  'ИИН и любые документы',
  'Адрес, школу или номер класса как место',
  'Текст ответов на задания',
  'Переписку с наставником за пределами вашего браузера',
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-[13px] font-medium text-ink-500">Данные учеников</p>
      <h1 className="mt-2 text-3xl font-medium leading-tight text-ink-900 sm:text-4xl">
        Что мы храним и что нет
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-600">
        Tanym пользуются школьники, поэтому здесь написано конкретно, а не общими словами.
        Каждый пункт соответствует тому, что действительно лежит в базе.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-medium text-ink-900">Что хранится</h2>
        <ul className="mt-5 flex flex-col gap-4">
          {COLLECTED.map((item) => (
            <li key={item.what} className="rounded-[var(--radius-card)] border border-ink-200 bg-white p-5">
              <p className="font-medium text-ink-900">{item.what}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{item.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-medium text-ink-900">Чего мы не собираем</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {NOT_COLLECTED.map((item) => (
            <li key={item} className="text-[15px] leading-relaxed text-ink-600">
              — {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-medium text-ink-900">Кто это видит</h2>
        <div className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-ink-600">
          <p>
            <strong className="text-ink-900">Сам ученик</strong> — всё своё.
          </p>
          <p>
            <strong className="text-ink-900">Учитель класса и администрация школы</strong> — прогресс и
            результаты диагностики учеников своего класса. Это нужно, чтобы учитель видел, кому и по какой
            теме помочь.
          </p>
          <p>
            <strong className="text-ink-900">Одноклассники</strong> — только строку в школьном рейтинге:
            имя (или псевдоним), баллы и серию.
          </p>
          <p>
            <strong className="text-ink-900">Внешние учебные центры</strong> — ничего. У них отдельная роль
            без доступа к учебной части; это закрыто на уровне базы данных, а не только интерфейса.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-[var(--radius-card)] border border-ink-200 bg-ink-50 p-6">
        <h2 className="text-xl font-medium text-ink-900">Если ученику нет 18 лет</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Регистрируясь, ученик подтверждает, что родители или законные представители знают о его занятиях
          в Tanym и не возражают против хранения перечисленного выше.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Родитель может попросить удалить аккаунт вместе со всеми данными — напишите на почту школы или
          администратору Tanym, и аккаунт будет удалён.
        </p>
      </section>

      <div className="mt-12">
        <Link href="/" className="text-sm font-medium text-ink-900 underline underline-offset-4">
          На главную
        </Link>
      </div>
    </div>
  );
}
