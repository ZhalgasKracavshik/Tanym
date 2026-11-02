'use client';

/**
 * Второй фактор администратора (TOTP: Google Authenticator, Microsoft
 * Authenticator, 2FAS, Яндекс Ключ и т. п.).
 *
 * Два режима:
 * - подключение: QR-код или ключ вручную → первый код из приложения;
 * - вход: шестизначный код из уже подключённого приложения.
 *
 * Сюда приводит src/proxy.ts при входе в /admin без второго фактора.
 * Настоящая защита — в базе (миграция pilot_admin_mfa): без кода админ не
 * может ничего одобрить, опубликовать или поменять роль, даже если
 * обойдёт эту страницу.
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { safeNextPath } from '@/lib/security/redirect';
import { useLang, type Dict } from '@/lib/i18n';
import { AuthShell, Field, FormMessage, SubmitButton } from '@/components/auth-ui';

type Mode = 'loading' | 'enroll' | 'verify' | 'error';

const TEXT: Dict<{
  heroTitle: string;
  heroText: string;
  enrollTitle: string;
  enrollSubtitle: string;
  verifyTitle: string;
  verifySubtitle: string;
  step1: string;
  step2: string;
  manualKey: string;
  copy: string;
  copied: string;
  code: string;
  codeHint: string;
  submit: string;
  wrongCode: string;
  loadError: string;
  lostPhone: string;
  signOut: string;
}> = {
  ru: {
    heroTitle: 'Админка под двумя ключами',
    heroText: 'Пароль может утечь. Код из телефона — нет: без него никто не опубликует событие от имени Taným и не увидит почты учеников.',
    enrollTitle: 'Подключите приложение-аутентификатор',
    enrollSubtitle: 'Один раз — потом при входе в админку нужен будет только код.',
    verifyTitle: 'Код из приложения',
    verifySubtitle: 'Откройте приложение-аутентификатор и введите шесть цифр для Taným.',
    step1: '1. Откройте Google Authenticator, Microsoft Authenticator или 2FAS и отсканируйте QR-код.',
    step2: '2. Введите шесть цифр, которые покажет приложение.',
    manualKey: 'Не сканируется? Введите ключ вручную:',
    copy: 'Скопировать',
    copied: 'Скопировано',
    code: 'Код из приложения',
    codeHint: 'Код меняется каждые 30 секунд.',
    submit: 'Подтвердить',
    wrongCode: 'Код не подошёл. Проверьте, что время на телефоне выставлено автоматически, и введите новый код.',
    loadError: 'Не удалось связаться с сервером. Обновите страницу.',
    lostPhone: 'Потеряли телефон? Второй фактор снимается в Supabase (см. db/migrations/…_pilot_admin_mfa.sql).',
    signOut: 'Выйти',
  },
  kk: {
    heroTitle: 'Әкімші бөлімі екі кілтпен',
    heroText: 'Құпия сөз жылыстауы мүмкін, ал телефондағы код — жоқ.',
    enrollTitle: 'Аутентификатор қосымшасын қосыңыз',
    enrollSubtitle: 'Бір рет қана — кейін тек код керек болады.',
    verifyTitle: 'Қосымшадағы код',
    verifySubtitle: 'Аутентификаторды ашып, Taným үшін алты санды енгізіңіз.',
    step1: '1. Google Authenticator, Microsoft Authenticator немесе 2FAS ашып, QR-кодты сканерлеңіз.',
    step2: '2. Қосымша көрсеткен алты санды енгізіңіз.',
    manualKey: 'Сканерленбей ме? Кілтті қолмен енгізіңіз:',
    copy: 'Көшіру',
    copied: 'Көшірілді',
    code: 'Қосымшадағы код',
    codeHint: 'Код әр 30 секунд сайын өзгереді.',
    submit: 'Растау',
    wrongCode: 'Код сәйкес келмеді. Телефондағы уақыт автоматты екенін тексеріп, жаңа кодты енгізіңіз.',
    loadError: 'Сервермен байланыс жоқ. Бетті жаңартыңыз.',
    lostPhone: 'Телефон жоғалды ма? Екінші факторды Supabase-та өшіруге болады.',
    signOut: 'Шығу',
  },
  en: {
    heroTitle: 'Admin under two keys',
    heroText: 'A password can leak; the code on your phone cannot.',
    enrollTitle: 'Connect an authenticator app',
    enrollSubtitle: 'Once — after that, only a code is needed to open the admin panel.',
    verifyTitle: 'Code from your app',
    verifySubtitle: 'Open your authenticator app and enter the six digits for Taným.',
    step1: '1. Open Google Authenticator, Microsoft Authenticator or 2FAS and scan the QR code.',
    step2: '2. Enter the six digits the app shows.',
    manualKey: "Can't scan? Enter the key manually:",
    copy: 'Copy',
    copied: 'Copied',
    code: 'Code from the app',
    codeHint: 'The code changes every 30 seconds.',
    submit: 'Confirm',
    wrongCode: "The code didn't match. Make sure your phone's time is set automatically and try a fresh code.",
    loadError: 'Could not reach the server. Reload the page.',
    lostPhone: 'Lost your phone? The second factor can be removed in Supabase.',
    signOut: 'Log out',
  },
};

function MfaForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'), '/admin');
  const { signOut } = useSchoolAuth();
  const t = TEXT[useLang()];

  const [mode, setMode] = useState<Mode>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (level?.currentLevel === 'aal2') {
        router.replace(next);
        return;
      }
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (listError || !factors) {
        setMode('error');
        return;
      }
      const verified = factors.totp.find((factor) => factor.status === 'verified');
      if (verified) {
        setFactorId(verified.id);
        setMode('verify');
        return;
      }
      // Брошенная на середине попытка подключения мешает новой — убираем.
      for (const factor of factors.all) {
        if (factor.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Taným ${new Date().toISOString().slice(0, 10)}`,
      });
      if (cancelled) return;
      if (enrollError || !enrolled) {
        setMode('error');
        return;
      }
      setFactorId(enrolled.id);
      setQr(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
      setMode('enroll');
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  async function submit() {
    if (!factorId) return;
    setError(null);
    setShakeKey((key) => key + 1);
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setError(t.wrongCode);
      return;
    }
    setBusy(true);
    const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: clean });
    setBusy(false);
    if (verifyError) {
      setError(t.wrongCode);
      setCode('');
      return;
    }
    setDone(true);
    // Сессия уже aal2 в куках — прокси пустит в админку.
    router.replace(next);
    router.refresh();
  }

  const enrolling = mode === 'enroll';

  return (
    <AuthShell
      heroTitle={t.heroTitle}
      heroText={t.heroText}
      title={enrolling ? t.enrollTitle : t.verifyTitle}
      subtitle={enrolling ? t.enrollSubtitle : t.verifySubtitle}
      footer={
        <button type="button" onClick={() => void signOut()} className="tap text-sm font-semibold text-ink-500 hover:text-ink-800">
          {t.signOut}
        </button>
      }
    >
      {mode === 'loading' && <div className="h-40 animate-pulse rounded-2xl bg-ink-100" />}
      {mode === 'error' && <FormMessage tone="error">{t.loadError}</FormMessage>}

      {(mode === 'enroll' || mode === 'verify') && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {enrolling && qr && (
            <div className="space-y-3 text-sm text-ink-600">
              <p>{t.step1}</p>
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR приходит data-URL от Supabase */}
                <img src={qr} alt="QR" width={184} height={184} className="rounded-xl border border-ink-200 bg-white p-2" />
              </div>
              {secret && (
                <div className="rounded-xl bg-ink-50 p-3">
                  <p className="text-xs text-ink-500">{t.manualKey}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-ink-900">{secret}</code>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(secret);
                        setCopied(true);
                      }}
                      className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-700 hover:bg-white"
                    >
                      {copied ? t.copied : t.copy}
                    </button>
                  </div>
                </div>
              )}
              <p>{t.step2}</p>
            </div>
          )}

          <Field
            label={t.code}
            hint={t.codeHint}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError(null);
            }}
            error={error ?? undefined}
            shakeKey={shakeKey}
            autoFocus
          />
          <SubmitButton loading={busy} success={done}>
            {t.submit}
          </SubmitButton>
          <p className="text-xs leading-relaxed text-ink-400">{t.lostPhone}</p>
        </form>
      )}
    </AuthShell>
  );
}

export default function MfaPage() {
  return (
    <Suspense>
      <MfaForm />
    </Suspense>
  );
}
