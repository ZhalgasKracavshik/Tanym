'use client';

/**
 * Размещение собственного объявления учеником или учителем.
 *
 * Уходит на модерацию в Supabase (status='pending'), а не сразу в общий
 * список: admin одобряет или отклоняет прямо на сайте (/admin), без выхода
 * в Supabase Dashboard. Раньше это было чисто локальным состоянием
 * (state.myListings) — «отправлено на проверку» никуда не доходило,
 * потому что проверять было некому.
 */

import { useState } from 'react';
import { LISTING_TYPES } from '@/lib/listings';
import type { ListingType } from '@/lib/listings';
import type { Language } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Icon } from '@/components/Icon';
import { Alert, Button, Panel } from '@/components/ui';

const TEXT = {
  ru: {
    open: 'Разместить своё объявление',
    heading: 'Новое объявление',
    typeLabel: 'Тип объявления',
    titleLabel: 'Заголовок',
    titlePlaceholder: 'Например, помогу с алгеброй, 7–9 класс',
    descriptionLabel: 'Описание',
    descriptionPlaceholder: 'Что именно предлагаешь, для кого и почему тебе можно доверять',
    categoryLabel: 'Направление',
    categoryPlaceholder: 'Математика, спорт, волонтёрство…',
    formatLabel: 'Формат',
    online: 'Онлайн',
    offline: 'Очно',
    both: 'Очно и онлайн',
    freeLabel: 'Бесплатно',
    priceLabel: 'Цена за занятие, тг',
    pricePlaceholder: '1500',
    scheduleLabel: 'Когда',
    schedulePlaceholder: 'Например, суббота 11:00–13:00',
    submit: 'Отправить на проверку',
    cancel: 'Отмена',
    published: 'Объявление отправлено на проверку школе.',
    studentTypesOnly: 'Ученики публикуют от своего имени. Секции школы размещает администрация.',
    error: 'Не получилось отправить. Проверьте поля.',
  },
} as const;

const INPUT =
  'w-full rounded-xl border border-ink-200 px-4 py-2.5 text-ink-900 outline-none transition-all duration-150 focus:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500';

interface Profile {
  id: string;
  name: string;
  // SchoolAuthGate типизирует роль как student|teacher|admin в общем случае,
  // хотя сюда admin никогда не попадёт — requireRole на странице это
  // гарантирует раньше, чем этот компонент вообще отрендерится.
  role: 'student' | 'teacher' | 'admin' | 'center';
  grade: number | null;
}

export function PublishForm({ language, profile }: { language: Language; profile: Profile }) {
  const t = TEXT.ru;

  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);

  const [type, setType] = useState<ListingType>('student-service');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [format, setFormat] = useState<'online' | 'offline' | 'both'>('offline');
  const [free, setFree] = useState(true);
  const [price, setPrice] = useState('');
  const [schedule, setSchedule] = useState('');

  /**
   * Ученик публикует только от своего имени.
   *
   * «Секции школы» — это официальный кружок, за который отвечает школа,
   * и объявление от ученика с такой плашкой выглядело бы как заявление
   * от лица школы. Раньше этот тип был ученику доступен — теперь нет.
   *
   * Внешний центр публикует только свой тип и, как ученик с учителем,
   * отправляет объявление на проверку: администрация решает, пускать ли
   * коммерческое предложение к школьникам.
   */
  const allowedTypes = LISTING_TYPES.filter((item) => {
    if (profile.role === 'teacher') return item.id === 'teacher-course' || item.id === 'school-club';
    if (profile.role === 'center') return item.id === 'external-center';
    return item.id === 'student-service';
  });

  const canSave =
    title.trim() !== '' &&
    description.trim() !== '' &&
    category.trim() !== '' &&
    schedule.trim() !== '' &&
    (free || Number(price) > 0);

  async function save() {
    setSending(true);
    setError(false);

    const supabase = createClient();
    const { error: insertError } = await supabase.from('published_listings').insert({
      admin_id: profile.id,
      status: 'pending',
      type,
      title: title.trim(),
      author_name: profile.name,
      author_role:
        profile.role === 'teacher'
          ? 'учитель'
          : profile.role === 'center'
            ? 'учебный центр'
            : `ученик ${profile.grade ?? ''} класса`,
      description: description.trim(),
      category: category.trim(),
      price: free ? null : Number(price),
      price_note: free ? null : 'за час',
      format,
      schedule: schedule.trim(),
      contact: 'Через платформу',
      verified: false,
    });

    setSending(false);
    if (insertError) {
      setError(true);
      return;
    }

    setTitle('');
    setDescription('');
    setCategory('');
    setPrice('');
    setSchedule('');
    setFree(true);
    setSaved(true);
    setOpen(false);
  }

  if (!open) {
    return (
      <div>
        {saved && (
          <div className="mb-4">
            <Alert tone="success">{t.published}</Alert>
          </div>
        )}
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          {t.open}
        </Button>
      </div>
    );
  }

  /*
    Форма лежит на панели, а не на карточке.

    Карточка означает самодостаточную единицу, которую можно мысленно перенести
    на другой экран: объявление, событие. Форма размещения существует только
    здесь и только пока она открыта, поэтому ей достаточно рамки без тени.
  */
  return (
    <Panel className="space-y-4 p-5 sm:p-6">
      <h3 className="font-medium text-ink-900">{t.heading}</h3>

      <div>
        <span className="mb-2 block text-sm font-semibold text-ink-800">{t.typeLabel}</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {allowedTypes.map((item) => (
            <button
              key={item.id}
              onClick={() => setType(item.id)}
              aria-pressed={type === item.id}
              className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-500 ${
                type === item.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-ink-200 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]'
              }`}
            >
              <Icon name={item.icon} size={18} />
              <span className="text-sm font-semibold text-ink-800">{item.title[language]}</span>
            </button>
          ))}
        </div>
        {profile.role !== 'teacher' && <p className="mt-2 text-xs text-ink-400">{t.studentTypesOnly}</p>}
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink-800">{t.titleLabel}</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.titlePlaceholder}
          className={INPUT}
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink-800">{t.descriptionLabel}</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder={t.descriptionPlaceholder}
          className={INPUT}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink-800">{t.categoryLabel}</span>
          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder={t.categoryPlaceholder}
            className={INPUT}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-ink-800">{t.formatLabel}</span>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as 'online' | 'offline' | 'both')}
            className={INPUT}
          >
            <option value="offline">{t.offline}</option>
            <option value="online">{t.online}</option>
            <option value="both">{t.both}</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-ink-800">{t.scheduleLabel}</span>
        <input
          type="text"
          value={schedule}
          onChange={(event) => setSchedule(event.target.value)}
          placeholder={t.schedulePlaceholder}
          className={INPUT}
        />
      </label>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={free}
            onChange={(event) => setFree(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-brand-500)]"
          />
          <span className="text-sm font-semibold text-ink-800">{t.freeLabel}</span>
        </label>

        {!free && (
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-ink-800">{t.priceLabel}</span>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder={t.pricePlaceholder}
              className={INPUT}
            />
          </label>
        )}
      </div>

      {error && <Alert tone="danger">{t.error}</Alert>}

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={!canSave || sending}>
          {t.submit}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
      </div>
    </Panel>
  );
}
