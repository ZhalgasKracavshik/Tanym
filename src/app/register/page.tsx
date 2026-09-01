'use client';

/**
 * Регистрация: одна форма, а не мастер из шагов.
 *
 * Роль выбирается здесь же и переключает следующее поле: ученику нужен код
 * класса, учителю — ничего. Мастер из трёх экранов на такой объём данных
 * только добавил бы кликов.
 *
 * Профиль (роль и класс) создаётся отдельным запросом после того, как
 * появилась сессия: роль хранится в нашей таблице profiles, а не в
 * учётной записи Supabase, и до входа записать её некуда.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthLink,
  AuthShell,
  ClassCodeField,
  Field,
  FormMessage,
  InfoBanner,
  PasswordField,
  ProviderButtons,
  Select,
  SubmitButton,
} from '@/components/auth-ui';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { checkPersonName } from '@/lib/personName';
import {
  canBeTeacher,
  domainRejectionMessage,
  fetchAllowedDomainRows,
  isEmailDomainAllowed,
  teacherDomainMessage,
} from '@/lib/supabase/allowedDomains';

function translateError(message: string): string {
  if (/already registered|already exists/i.test(message)) {
    return 'Такая почта уже зарегистрирована — попробуйте войти.';
  }
  if (/password.*at least|weak password/i.test(message)) {
    return 'Пароль слишком короткий: нужно не меньше 6 символов.';
  }
  if (/invalid email/i.test(message)) return 'Проверьте адрес почты.';
  if (/rate limit|too many/i.test(message)) return 'Слишком много попыток. Подождите минуту.';
  /*
    Текст RLS наружу не пускаем ни при каких обстоятельствах: он всё равно
    ничего не объясняет человеку, а выглядит как поломка сайта.
  */
  if (/row-level security|violates/i.test(message)) {
    return 'С этой почтой зарегистрироваться нельзя — домен не разрешён администратором.';
  }
  return message;
}

const CLASS_CODE_ERRORS: Record<string, string> = {
  class_not_found: 'Класс с таким кодом не найден. Проверьте код у учителя.',
  class_code_required: 'Введите код класса.',
};

const HERO_FEATURES = [
  { icon: 'compass' as const, text: 'Движок сам решает, что учить дальше' },
  { icon: 'sparkles' as const, text: 'ИИ объясняет решение, не выдумывая ответ' },
  { icon: 'trophy' as const, text: 'Достижения и рейтинг школы' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithPassword, chooseRole, signInWithProvider } = useSchoolAuth();

  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [classCode, setClassCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* Ошибки конкретных полей — см. пояснение в login/page.tsx. */
  const [nameError, setNameError] = useState<string | undefined>();
  const [classCodeError, setClassCodeError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [shakeKey, setShakeKey] = useState(0);

  function resetFieldErrors() {
    setFormError(null);
    setNotice(null);
    setNameError(undefined);
    setClassCodeError(undefined);
    setEmailError(undefined);
    setPasswordError(undefined);
  }

  async function submit() {
    resetFieldErrors();
    setShakeKey((k) => k + 1);

    /*
      Имя видно одноклассникам в рейтинге, поэтому проверка строже, чем
      «поле не пустое»: раньше проходила одна буква или набор цифр.
    */
    const checkedName = checkPersonName(name);
    let hasError = false;
    if (!checkedName.ok) {
      setNameError(checkedName.reason);
      hasError = true;
    }
    if (!email.trim()) {
      setEmailError('Введите почту.');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Введите пароль.');
      hasError = true;
    }
    if (hasError || !checkedName.ok) return;
    /*
      Код класса больше не обязателен здесь: его спросят в онбординге, где
      от него можно отказаться кнопкой «Позже». Требовать код прямо на
      регистрации значило упереться в него тем, у кого его сейчас нет под
      рукой, — а без регистрации они не могут вообще ничего.
    */

    setStatus('loading');

    /*
      Домен проверяем до signUp, а не после.

      Ограничение живёт в RLS на profiles, то есть срабатывает на втором
      шаге регистрации — когда учётная запись в Supabase уже создана.
      Раньше человек с неподходящим адресом получал аккаунт без профиля:
      войти может, пользоваться ничем не может, а повторная регистрация
      отвечает ему «почта уже зарегистрирована». Выбраться из этого
      состояния самостоятельно нельзя — в базе такой пользователь уже есть.
    */
    const domainRows = await fetchAllowedDomainRows();
    const allowedDomains = domainRows.map((row) => row.domain);
    if (!isEmailDomainAllowed(email, allowedDomains)) {
      setStatus('idle');
      setEmailError(domainRejectionMessage(allowedDomains));
      setShakeKey((k) => k + 1);
      return;
    }

    /*
      Роль учителя открывает панель класса и данные детей, поэтому её
      выдаём только со школьной почты. Проверяем до signUp по той же
      причине, что и домен вообще: иначе учётная запись создалась бы, а
      профиль — нет, и человек остался бы ни с чем.

      Настоящая проверка всё равно стоит в политике базы: эта нужна, чтобы
      объяснить причину, а не чтобы защитить.
    */
    if (role === 'teacher' && !canBeTeacher(email, domainRows)) {
      setStatus('idle');
      setEmailError(teacherDomainMessage(domainRows));
      setShakeKey((k) => k + 1);
      return;
    }

    const signUp = await signUpWithPassword(email.trim(), password, checkedName.value);

    if (!signUp.ok) {
      setStatus('idle');
      const message = translateError(signUp.error ?? 'Не удалось зарегистрироваться.');
      /*
        Слабый пароль и занятая почта относятся к конкретным полям — но
        распознать это можно только по тексту ошибки, а не по коду:
        Supabase не различает их структурно в этом ответе.
      */
      if (/пароль/i.test(message)) setPasswordError(message);
      else if (/почта/i.test(message)) setEmailError(message);
      else setFormError(message);
      setShakeKey((k) => k + 1);
      return;
    }

    /*
      Подтверждение почты в этом проекте Supabase включено на уровне
      настроек Auth (Dashboard → Authentication → Providers → Email →
      Confirm email) — так и оставалось всё это время, что бы ни говорил
      комментарий в другом коммите. Проверено напрямую в базе: свежие
      email/password-регистрации остаются в auth.users с email_confirmed_at
      = null и session = null, пока человек не перейдёт по ссылке из письма.

      Без этой проверки chooseRole вызывался сразу после signUp() и падал
      с сырым not_authenticated — POST /api/profile корректно требует
      сессию, а её ещё не было. Если конфирм действительно не нужен на
      MVP — это отключается в дашборде Supabase (описанным выше тумблером),
      а не в этом коде: код должен одинаково верно работать в обоих случаях.
    */
    if (signUp.needsConfirmation) {
      setStatus('idle');
      setNotice(
        'Мы отправили письмо для подтверждения. Откройте ссылку из него, затем войдите — и мы спросим роль.',
      );
      return;
    }

    const profile = await chooseRole(role, classCode.trim());
    if (!profile.ok) {
      setStatus('idle');
      if (profile.error === 'domain_not_allowed') {
        setEmailError(domainRejectionMessage(profile.domains ?? allowedDomains));
        setShakeKey((k) => k + 1);
        return;
      }
      const classMessage = CLASS_CODE_ERRORS[profile.error ?? ''];
      if (classMessage) {
        setClassCodeError(classMessage);
      } else {
        setFormError(translateError(profile.error ?? 'Не удалось создать профиль.'));
      }
      setShakeKey((k) => k + 1);
      return;
    }

    setStatus('success');
    /*
      Ученика ведём в онбординг, учителя — сразу в панель.
      chooseRole создал профиль с ролью и классом, но не с классом обучения,
      предметами и целью: без них кабинет и план показывают «Профиль ещё не
      создан». Раньше редирект шёл прямо в кабинет, и первым, что видел
      новый ученик, была именно эта заглушка. Учителю те же поля не нужны.
    */
    router.replace(role === 'teacher' ? '/teacher' : '/onboarding');
    router.refresh();
  }

  return (
    <AuthShell
      heroTitle="Готовы начать?"
      heroText="Ученику — персональный план и рейтинг. Учителю — прогресс всего класса."
      heroFeatures={HERO_FEATURES}
      title="Создать аккаунт"
      subtitle="Заполните несколько полей — дальше система сделает остальное."
      footer={
        <>
          Уже есть аккаунт? <AuthLink href="/login">Войти</AuthLink>
        </>
      }
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field
          label="Имя и фамилия"
          autoComplete="name"
          placeholder="Айсултан Жакыпов"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(undefined);
          }}
          hint="Настоящие имя и фамилия: так вас увидят одноклассники в рейтинге."
          error={nameError}
          shakeKey={shakeKey}
        />

        <Select
          label="Я"
          value={role}
          onChange={(event) => setRole(event.target.value as 'student' | 'teacher')}
        >
          <option value="student">Ученик</option>
          <option value="teacher">Учитель</option>
        </Select>

        {/* Код класса только у ученика: учитель класс создаёт, а не входит в него */}
        {role === 'student' && (
          <ClassCodeField
            label="Код класса"
            value={classCode}
            onValueChange={(value) => {
              setClassCode(value);
              if (classCodeError) setClassCodeError(undefined);
            }}
            hint="Шесть символов, их даёт классный руководитель. Можно оставить пустым и ввести позже."
            error={classCodeError}
            shakeKey={shakeKey}
          />
        )}

        {role === 'teacher' && (
          <InfoBanner>
            После регистрации вы получите код класса — раздайте его ученикам.
          </InfoBanner>
        )}

        <Field
          label="Почта"
          type="email"
          autoComplete="email"
          placeholder="name@binom.edu.kz"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (emailError) setEmailError(undefined);
          }}
          error={emailError}
          shakeKey={shakeKey}
        />

        <PasswordField
          label="Пароль"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (passwordError) setPasswordError(undefined);
          }}
          hint="Не меньше 6 символов."
          error={passwordError}
          shakeKey={shakeKey}
        />

        {formError && <FormMessage tone="error">{formError}</FormMessage>}
        {notice && <FormMessage tone="success">{notice}</FormMessage>}

        <SubmitButton loading={status === 'loading'} success={status === 'success'}>
          Зарегистрироваться
        </SubmitButton>
      </form>

      <div className="mt-7">
        <ProviderButtons
          dividerLabel="или"
          onGoogle={() => signInWithProvider('google', '/dashboard')}
          onApple={() => signInWithProvider('apple', '/dashboard')}
        />
      </div>
    </AuthShell>
  );
}
