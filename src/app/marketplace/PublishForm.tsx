'use client';

/**
 * Размещение собственного объявления.
 *
 * Доступно и ученику, и учителю: старшеклассник может предложить помощь младшим
 * или собрать волонтёрскую команду ровно так же, как учитель объявляет курс.
 * Это осознанное решение — в школе полезное знание есть не только у взрослых.
 *
 * Любое созданное объявление помечается pending: в реальной школе публикация
 * без проверки завуча закончится тем, что через платформу начнут продавать
 * что угодно. Здесь модерации нет, но состояние «ждёт проверки» показывается
 * честно, а не имитируется мгновенной публикацией.
 */

import { useState } from 'react';
import { createId } from '@/lib/storage';
import { LISTING_TYPES } from '@/lib/listings';
import type { Listing, ListingType } from '@/lib/listings';
import type { Dict } from '@/lib/i18n';
import { useStore } from '@/components/StoreProvider';
import { Alert, Button, Card } from '@/components/ui';

const TEXT: Dict<{
  open: string;
  heading: string;
  needProfile: string;
  typeLabel: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  formatLabel: string;
  online: string;
  offline: string;
  both: string;
  freeLabel: string;
  priceLabel: string;
  pricePlaceholder: string;
  scheduleLabel: string;
  schedulePlaceholder: string;
  submit: string;
  cancel: string;
  published: string;
  studentTypesOnly: string;
}> = {
  ru: {
    open: '+ Разместить своё объявление',
    heading: 'Новое объявление',
    needProfile: 'Чтобы разместить объявление, сначала создайте профиль.',
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
    studentTypesOnly: 'Ученики размещают объявления в разделах «От учеников» и «Секции школы».',
  },
  kk: {
    open: '+ Өз хабарландыруымды жариялау',
    heading: 'Жаңа хабарландыру',
    needProfile: 'Хабарландыру жариялау үшін алдымен профиль құрыңыз.',
    typeLabel: 'Хабарландыру түрі',
    titleLabel: 'Тақырып',
    titlePlaceholder: 'Мысалы, алгебрадан көмектесемін, 7–9 сынып',
    descriptionLabel: 'Сипаттама',
    descriptionPlaceholder: 'Нақты не ұсынасың, кімге және неге саған сенуге болады',
    categoryLabel: 'Бағыт',
    categoryPlaceholder: 'Математика, спорт, волонтёрлық…',
    formatLabel: 'Формат',
    online: 'Онлайн',
    offline: 'Қатысып',
    both: 'Қатысып және онлайн',
    freeLabel: 'Тегін',
    priceLabel: 'Бір сабақтың бағасы, тг',
    pricePlaceholder: '1500',
    scheduleLabel: 'Қашан',
    schedulePlaceholder: 'Мысалы, сенбі 11:00–13:00',
    submit: 'Тексеруге жіберу',
    cancel: 'Болдырмау',
    published: 'Хабарландыру мектеп тексеруіне жіберілді.',
    studentTypesOnly: 'Оқушылар «Оқушылардан» және «Мектеп үйірмелері» бөлімдеріне жариялайды.',
  },
  en: {
    open: '+ Post your own listing',
    heading: 'New listing',
    needProfile: 'Create a profile first to post a listing.',
    typeLabel: 'Listing type',
    titleLabel: 'Title',
    titlePlaceholder: 'For example, I can help with algebra, grades 7–9',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'What exactly you offer, for whom, and why you can be trusted',
    categoryLabel: 'Area',
    categoryPlaceholder: 'Maths, sport, volunteering…',
    formatLabel: 'Format',
    online: 'Online',
    offline: 'In person',
    both: 'In person and online',
    freeLabel: 'Free',
    priceLabel: 'Price per lesson, KZT',
    pricePlaceholder: '1500',
    scheduleLabel: 'When',
    schedulePlaceholder: 'For example, Saturday 11:00–13:00',
    submit: 'Send for review',
    cancel: 'Cancel',
    published: 'Your listing has been sent to the school for review.',
    studentTypesOnly: 'Students post under “From students” and “School clubs”.',
  },
};

const INPUT =
  'w-full rounded-xl border border-ink-200 px-4 py-2.5 text-ink-900 outline-none focus:border-brand-500';

export function PublishForm() {
  const { state, addListing } = useStore();
  const t = TEXT[state.language];
  const profile = state.profile;

  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const [type, setType] = useState<ListingType>('student-service');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [format, setFormat] = useState<Listing['format']>('offline');
  const [free, setFree] = useState(true);
  const [price, setPrice] = useState('');
  const [schedule, setSchedule] = useState('');

  /**
   * Ученику доступны не все типы: курсы ведут учителя, а внешние центры
   * размещает администрация. Ограничение снимает ложные ожидания ещё до
   * отправки формы, а не после отказа модерации.
   */
  const allowedTypes = LISTING_TYPES.filter((item) =>
    profile?.role === 'teacher'
      ? item.id !== 'external-center'
      : item.id === 'student-service' || item.id === 'school-club',
  );

  const canSave =
    title.trim() !== '' &&
    description.trim() !== '' &&
    category.trim() !== '' &&
    schedule.trim() !== '' &&
    (free || Number(price) > 0);

  function save() {
    if (!profile) return;

    const listing: Listing = {
      id: createId('listing'),
      type,
      title: title.trim(),
      authorName: profile.name,
      authorRole:
        profile.role === 'teacher' ? 'учитель' : `ученик ${profile.grade} класса`,
      description: description.trim(),
      category: category.trim(),
      price: free ? null : Number(price),
      priceNote: free ? undefined : 'за час',
      format,
      schedule: schedule.trim(),
      contact: 'Через платформу',
      verified: false,
      pending: true,
    };

    addListing(listing);

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
        {profile ? (
          <Button onClick={() => setOpen(true)}>{t.open}</Button>
        ) : (
          <Alert>{t.needProfile}</Alert>
        )}
      </div>
    );
  }

  return (
    <Card className="space-y-5">
      <h3 className="font-bold text-ink-900">{t.heading}</h3>

      <div>
        <span className="mb-2 block text-sm font-semibold text-ink-800">{t.typeLabel}</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {allowedTypes.map((item) => (
            <button
              key={item.id}
              onClick={() => setType(item.id)}
              aria-pressed={type === item.id}
              className={`flex items-start gap-2 rounded-xl border-2 p-3 text-left transition-colors ${
                type === item.id ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-300'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span className="text-sm font-semibold text-ink-800">{item.title[state.language]}</span>
            </button>
          ))}
        </div>
        {profile?.role !== 'teacher' && <p className="mt-2 text-xs text-ink-400">{t.studentTypesOnly}</p>}
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
            onChange={(event) => setFormat(event.target.value as Listing['format'])}
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
          <label className="mt-3 block">
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

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} disabled={!canSave}>
          {t.submit}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
      </div>
    </Card>
  );
}
