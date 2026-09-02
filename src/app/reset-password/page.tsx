'use client';

/**
 * Установка нового пароля по ссылке из письма.
 *
 * Ссылка приводит сюда уже с временной сессией — Supabase обменивает
 * токен из адреса на неё автоматически. Поэтому отдельного поля «старый
 * пароль» здесь нет: доступ к почте и есть подтверждение.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLink, AuthShell, FormMessage, PasswordField, SubmitButton } from '@/components/auth-ui';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { useLang, type Dict } from '@/lib/i18n';

const TEXT: Dict<{
  heroTitle: string;
  heroText: string;
  title: string;
  subtitle: string;
  linkBroken: string;
  requestNew: string;
  expiredNotice: string;
  checking: string;
  linkUsed: string;
  notFromEmail: string;
  newPassword: string;
  repeatPassword: string;
  passwordHint: string;
  tooShort: string;
  mismatch: string;
  linkExpired: string;
  genericError: string;
  success: string;
  submit: string;
}> = {
  ru: {
    heroTitle: 'Почти готово',
    heroText: 'Придумайте пароль, который не используете больше нигде, и возвращайтесь к учёбе.',
    title: 'Новый пароль',
    subtitle: 'Придумайте пароль, который не используете больше нигде.',
    linkBroken: 'Ссылка не работает?',
    requestNew: 'Запросить новую',
    expiredNotice: 'Похоже, ссылка устарела или открыта не из письма. Запросите новое письмо для сброса.',
    checking: 'Проверяем ссылку…',
    linkUsed: 'Ссылка уже использована или устарела. Код из письма одноразовый и сгорает при первом переходе — иногда его успевает открыть почтовый сканер. Запросите новое письмо.',
    notFromEmail: 'Эта страница открывается только по ссылке из письма. Запросите письмо для сброса пароля.',
    newPassword: 'Новый пароль',
    repeatPassword: 'Ещё раз',
    passwordHint: 'Не меньше 6 символов.',
    tooShort: 'Пароль должен быть не короче 6 символов.',
    mismatch: 'Пароли не совпадают.',
    linkExpired: 'Ссылка устарела. Запросите новое письмо.',
    genericError: 'Не удалось сменить пароль.',
    success: 'Пароль обновлён. Открываем кабинет…',
    submit: 'Сохранить пароль',
  },
  kk: {
    heroTitle: 'Дерлік дайын',
    heroText: 'Басқа жерде қолданбайтын құпия сөз ойлап тауып, оқуға оралыңыз.',
    title: 'Жаңа құпия сөз',
    subtitle: 'Басқа жерде қолданбайтын құпия сөз ойлап табыңыз.',
    linkBroken: 'Сілтеме жұмыс істемей тұр ма?',
    requestNew: 'Жаңасын сұрау',
    expiredNotice: 'Сілтеменің мерзімі өтіп кеткен сияқты немесе ол хаттан ашылмаған. Қалпына келтіру үшін жаңа хат сұраңыз.',
    checking: 'Сілтемені тексеріп жатырмыз…',
    linkUsed: 'Сілтеме бұрын пайдаланылған немесе мерзімі өткен. Хаттағы код бір реттік және алғаш ашылғанда жойылады — кейде оны пошта сканері ашып үлгереді. Жаңа хат сұраңыз.',
    notFromEmail: 'Бұл бет тек хаттағы сілтеме арқылы ашылады. Құпия сөзді қалпына келтіру үшін хат сұраңыз.',
    newPassword: 'Жаңа құпия сөз',
    repeatPassword: 'Тағы бір рет',
    passwordHint: '6 таңбадан кем емес.',
    tooShort: 'Құпия сөз 6 таңбадан кем болмауы керек.',
    mismatch: 'Құпия сөздер сәйкес келмейді.',
    linkExpired: 'Сілтеменің мерзімі өтті. Жаңа хат сұраңыз.',
    genericError: 'Құпия сөзді ауыстыру мүмкін болмады.',
    success: 'Құпия сөз жаңартылды. Кабинетті ашып жатырмыз…',
    submit: 'Құпия сөзді сақтау',
  },
  en: {
    heroTitle: 'Almost done',
    heroText: "Pick a password you don't use anywhere else, and get back to studying.",
    title: 'New password',
    subtitle: "Pick a password you don't use anywhere else.",
    linkBroken: "Link not working?",
    requestNew: 'Request a new one',
    expiredNotice: "This link looks expired or wasn't opened from the email. Request a new reset email.",
    checking: 'Checking the link…',
    linkUsed: 'This link has already been used or has expired. The code in the email is single-use and burns on the first visit — sometimes a mail scanner opens it first. Request a new email.',
    notFromEmail: 'This page only opens from the link in the email. Request a password reset email.',
    newPassword: 'New password',
    repeatPassword: 'Repeat it',
    passwordHint: 'At least 6 characters.',
    tooShort: 'Password must be at least 6 characters.',
    mismatch: "Passwords don't match.",
    linkExpired: 'The link has expired. Request a new email.',
    genericError: 'Could not change the password.',
    success: 'Password updated. Opening your dashboard…',
    submit: 'Save password',
  },
};

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { updatePassword, isSignedIn, loading } = useSchoolAuth();
  const lang = useLang();
  const t = TEXT[lang];

  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [repeatError, setRepeatError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  /*
    Старые письма ведут прямо сюда, с необменянным кодом в адресе. Для них
    сессия появится только после того, как браузерный клиент сам сходит за
    ней, — и до этого момента выносить вердикт «ссылка не работает» нельзя.
    Новые письма проходят через /auth/callback и попадают сюда уже с
    сессией, так что это состояние их не касается.
  */
  const authError = params.get('authError');
  const hasRawCode = params.has('code') || params.has('token_hash');
  const [waitedForCode, setWaitedForCode] = useState(false);

  useEffect(() => {
    if (!hasRawCode || isSignedIn) return;
    // Если за это время сессия не появилась, обмен не состоится уже никогда.
    const timer = setTimeout(() => setWaitedForCode(true), 6000);
    return () => clearTimeout(timer);
  }, [hasRawCode, isSignedIn]);

  // Перекидываем на дашборд после успеха, но не мгновенно: пользователь
  // должен успеть увидеть, что пароль действительно сменился.
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => router.push('/dashboard'), 1200);
    return () => clearTimeout(timer);
  }, [status, router]);

  async function submit() {
    setPasswordError(undefined);
    setRepeatError(undefined);
    setFormError(null);
    setShakeKey((k) => k + 1);

    let hasError = false;
    if (password.length < 6) {
      setPasswordError(t.tooShort);
      hasError = true;
    }
    if (password !== repeat) {
      setRepeatError(t.mismatch);
      hasError = true;
    }
    if (hasError) return;

    setStatus('loading');
    const result = await updatePassword(password);

    if (!result.ok) {
      setStatus('idle');
      setFormError(/session|expired|invalid/i.test(result.error ?? '') ? t.linkExpired : (result.error ?? t.genericError));
      setShakeKey((k) => k + 1);
      return;
    }

    setStatus('success');
  }

  /*
    Обмен кода мог не состояться по разным причинам, и человеку важно
    понимать, по какой: сгоревшая ссылка чинится новым письмом, а зайти
    на страницу напрямую нельзя вообще.
  */
  const blocker: string | null = authError
    ? /expired|access_denied|otp|exchange_failed/i.test(authError)
      ? t.linkUsed
      : t.expiredNotice
    : !loading && !isSignedIn && !hasRawCode
      ? t.notFromEmail
      : !loading && !isSignedIn && waitedForCode
        ? t.linkUsed
        : null;

  const checking = !blocker && !isSignedIn;

  return (
    <AuthShell
      heroTitle={t.heroTitle}
      heroText={t.heroText}
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.linkBroken} <AuthLink href="/forgot-password">{t.requestNew}</AuthLink>
        </>
      }
    >
      {/*
        Сообщение подбирается по тому, что реально произошло, а не одно на
        все случаи. Раньше здесь была единственная фраза «устарела или
        открыта не из письма», и она показывалась в том числе на совершенно
        рабочей ссылке — просто потому, что сессия к первому кадру ещё не
        успела появиться. Человек читал, что ссылка сломана, и шёл
        запрашивать новую, которая ломалась точно так же.
      */}
      {blocker ? (
        <FormMessage tone="error">{blocker}</FormMessage>
      ) : checking ? (
        <FormMessage tone="info">{t.checking}</FormMessage>
      ) : (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <PasswordField
            label={t.newPassword}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) setPasswordError(undefined);
            }}
            hint={t.passwordHint}
            error={passwordError}
            shakeKey={shakeKey}
          />

          <PasswordField
            label={t.repeatPassword}
            autoComplete="new-password"
            placeholder="••••••••"
            value={repeat}
            onChange={(event) => {
              setRepeat(event.target.value);
              if (repeatError) setRepeatError(undefined);
            }}
            error={repeatError}
            shakeKey={shakeKey}
          />

          {formError && <FormMessage tone="error">{formError}</FormMessage>}
          {status === 'success' && <FormMessage tone="success">{t.success}</FormMessage>}

          <SubmitButton loading={status === 'loading'} success={status === 'success'}>
            {t.submit}
          </SubmitButton>
        </form>
      )}
    </AuthShell>
  );
}

/*
 * useSearchParams обязан быть под Suspense, иначе сборка не может отрисовать
 * страницу заранее и падает на пререндере.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
