'use client';

/**
 * Профиль внешнего учебного центра.
 *
 * Отдельный экран, а не ветка внутри ученического профиля. Причина видна
 * с первого взгляда на прежний вариант: центру показывали «10 А», «О
 * себе — расскажите о своих целях и увлечениях», вкладки «Учёба и класс»
 * и «Активность и достижения». Организация не учится в классе и не
 * собирает достижения; половина полей была не про неё, а вторая половина
 * — про ученика, которым она не является.
 *
 * Здесь только то, что действительно нужно организации: как она
 * называется, как с ней связаться, куда ведёт её сайт, и пароль.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useStore } from './StoreProvider';
import { Alert, Button, Card } from './ui';
import { Icon } from './Icon';
import type { Language } from '@/lib/types';

const TEXT: Record<Language, Record<string, string>> = {
  ru: {
    title: 'Профиль центра',
    lead: 'Эти данные видят ученики в ваших объявлениях.',
    org: 'Название организации',
    contact: 'Контакт для учеников',
    contactHint: 'Телефон, WhatsApp или адрес — показывается в объявлении',
    site: 'Сайт или страница в соцсети',
    email: 'Почта для входа',
    emailNote: 'Изменить нельзя — по ней вы входите.',
    save: 'Сохранить',
    saving: 'Сохраняем…',
    saved: 'Сохранено.',
    failed: 'Не удалось сохранить. Проверьте связь.',
    listings: 'Ваши объявления',
    listingsLead: 'Ученики видят только одобренные школой.',
    toListings: 'Открыть «Возможности»',
    security: 'Вход и безопасность',
    newPassword: 'Новый пароль',
    changePassword: 'Сменить пароль',
    passwordShort: 'Не меньше 6 символов.',
    passwordDone: 'Пароль обновлён.',
    signOut: 'Выйти из аккаунта',
  },
  kk: {
    title: 'Орталық профилі',
    lead: 'Бұл деректерді оқушылар хабарландыруларыңызда көреді.',
    org: 'Ұйым атауы',
    contact: 'Оқушыларға арналған байланыс',
    contactHint: 'Телефон, WhatsApp немесе мекенжай — хабарландыруда көрінеді',
    site: 'Сайт немесе әлеуметтік желі парақшасы',
    email: 'Кіру поштасы',
    emailNote: 'Өзгертуге болмайды — сол арқылы кіресіз.',
    save: 'Сақтау',
    saving: 'Сақталуда…',
    saved: 'Сақталды.',
    failed: 'Сақтау мүмкін болмады. Байланысты тексеріңіз.',
    listings: 'Сіздің хабарландыруларыңыз',
    listingsLead: 'Оқушылар тек мектеп мақұлдағанын көреді.',
    toListings: '«Мүмкіндіктерді» ашу',
    security: 'Кіру және қауіпсіздік',
    newPassword: 'Жаңа құпия сөз',
    changePassword: 'Құпия сөзді ауыстыру',
    passwordShort: '6 таңбадан кем емес.',
    passwordDone: 'Құпия сөз жаңартылды.',
    signOut: 'Аккаунттан шығу',
  },
  en: {
    title: 'Centre profile',
    lead: 'Students see this information in your listings.',
    org: 'Organisation name',
    contact: 'Contact for students',
    contactHint: 'Phone, WhatsApp or address — shown in your listing',
    site: 'Website or social page',
    email: 'Sign-in email',
    emailNote: 'Cannot be changed — you sign in with it.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved.',
    failed: 'Could not save. Check your connection.',
    listings: 'Your listings',
    listingsLead: 'Students only see what the school approved.',
    toListings: 'Open Opportunities',
    security: 'Sign-in and security',
    newPassword: 'New password',
    changePassword: 'Change password',
    passwordShort: 'At least 6 characters.',
    passwordDone: 'Password updated.',
    signOut: 'Sign out',
  },
};

const fieldCls =
  'mt-1.5 w-full rounded-[var(--radius-control)] border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-ink-500';

export function CenterProfile() {
  const { state } = useStore();
  const { profile, email, refresh, updatePassword, signOut } = useSchoolAuth();
  const t = TEXT[state.language];

  const [org, setOrg] = useState(profile?.org_name ?? profile?.name ?? '');
  const [contact, setContact] = useState(profile?.org_contact ?? '');
  const [site, setSite] = useState(profile?.org_site ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  const [password, setPassword] = useState('');
  const [passwordState, setPasswordState] = useState<'idle' | 'short' | 'done'>('idle');

  async function save() {
    setStatus('saving');
    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      /*
        Имя профиля меняется вместе с названием организации: под ним центр
        подписан в объявлениях, и расхождение между «названием» и
        «подписью» ученик читал бы как две разные организации.
      */
      body: JSON.stringify({ name: org.trim(), orgName: org.trim(), orgContact: contact.trim(), orgSite: site.trim() }),
    }).catch(() => null);

    if (!response || !response.ok) {
      setStatus('failed');
      return;
    }
    await refresh(true);
    setStatus('saved');
  }

  async function changePassword() {
    if (password.length < 6) {
      setPasswordState('short');
      return;
    }
    const result = await updatePassword(password);
    if (result.ok) {
      setPassword('');
      setPasswordState('done');
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-medium text-ink-900">{t.title}</h1>
      <p className="mt-2 text-sm text-ink-500">{t.lead}</p>

      <Card className="mt-8 p-6">
        <label className="block">
          <span className="text-sm font-medium text-ink-800">{t.org}</span>
          <input className={fieldCls} value={org} maxLength={120} onChange={(e) => setOrg(e.target.value)} />
        </label>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-ink-800">{t.contact}</span>
          <input
            className={fieldCls}
            value={contact}
            maxLength={200}
            onChange={(e) => setContact(e.target.value)}
          />
          <span className="mt-1.5 block text-xs text-ink-400">{t.contactHint}</span>
        </label>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-ink-800">{t.site}</span>
          <input
            className={fieldCls}
            value={site}
            placeholder="https://"
            maxLength={300}
            onChange={(e) => setSite(e.target.value)}
          />
        </label>

        <div className="mt-5">
          <span className="text-sm font-medium text-ink-800">{t.email}</span>
          <p className="mt-1.5 text-[15px] text-ink-600">{email}</p>
          <span className="mt-1 block text-xs text-ink-400">{t.emailNote}</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={status === 'saving' || org.trim().length < 2}>
            {status === 'saving' ? t.saving : t.save}
          </Button>
          {status === 'saved' && <span className="text-sm font-medium text-success-700">{t.saved}</span>}
          {status === 'failed' && <span className="text-sm font-medium text-danger-600">{t.failed}</span>}
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-medium text-ink-900">{t.listings}</h2>
        <p className="mt-1 text-sm text-ink-500">{t.listingsLead}</p>
        <Link
          href="/marketplace"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink-900 underline underline-offset-4"
        >
          {t.toListings}
          <Icon name="arrow-right" size={15} />
        </Link>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-base font-medium text-ink-900">{t.security}</h2>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-ink-800">{t.newPassword}</span>
          <input
            type="password"
            className={fieldCls}
            value={password}
            autoComplete="new-password"
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordState('idle');
            }}
          />
        </label>

        {passwordState === 'short' && (
          <div className="mt-3">
            <Alert tone="danger">{t.passwordShort}</Alert>
          </div>
        )}
        {passwordState === 'done' && (
          <div className="mt-3">
            <Alert tone="success">{t.passwordDone}</Alert>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={changePassword} disabled={password === ''}>
            {t.changePassword}
          </Button>
          <Button variant="ghost" onClick={() => signOut()}>
            {t.signOut}
          </Button>
        </div>
      </Card>
    </div>
  );
}
