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
  SegmentedToggle,
  SubmitButton,
} from '@/components/auth-ui';
import type { IconName } from '@/components/Icon';
import { useSchoolAuth } from '@/lib/supabase/useSchoolAuth';
import { checkPersonName } from '@/lib/personName';
import { useLang, type Dict } from '@/lib/i18n';
import {
  canBeTeacher,
  domainRejectionMessage,
  fetchAllowedDomainRows,
  isEmailDomainAllowed,
  teacherDomainMessage,
} from '@/lib/supabase/allowedDomains';

/*
  Значки фактов о продукте не зависят от языка — меняется только текст,
  который лежит в TEXT ниже. Порядок здесь и в heroFeatures в TEXT должен
  совпадать: массивы соединяются по индексу при отрисовке.
*/
const HERO_ICONS: IconName[] = ['compass', 'sparkles', 'trophy'];

const TEXT: Dict<{
  heroTitle: string;
  heroFeatures: string[];
  title: string;
  subtitle: string;
  name: string;
  namePlaceholder: string;
  nameHint: string;
  roleLabel: string;
  student: string;
  teacher: string;
  classCode: string;
  classCodeHint: string;
  teacherBanner: string;
  email: string;
  password: string;
  passwordHint: string;
  emailRequired: string;
  passwordRequired: string;
  alreadyRegistered: string;
  weakPassword: string;
  invalidEmail: string;
  rateLimit: string;
  domainBlocked: string;
  genericSignUpError: string;
  confirmEmailNotice: string;
  classNotFound: string;
  classCodeRequired: string;
  genericProfileError: string;
  submit: string;
  or: string;
  haveAccount: string;
  login: string;
}> = {
  ru: {
    heroTitle: 'Готовы начать?',
    heroFeatures: [
      'Движок сам решает, что учить дальше',
      'ИИ объясняет решение, не выдумывая ответ',
      'Достижения и рейтинг школы',
    ],
    title: 'Создать аккаунт',
    subtitle: 'Заполните несколько полей — дальше система сделает остальное.',
    name: 'Имя и фамилия',
    namePlaceholder: 'Айсултан Жакыпов',
    nameHint: 'Настоящие имя и фамилия: так вас увидят одноклассники в рейтинге.',
    roleLabel: 'Я',
    student: 'Ученик',
    teacher: 'Учитель',
    classCode: 'Код класса',
    classCodeHint: 'Возьмите код класса у классного руководителя. Не под рукой — можно ввести позже.',
    teacherBanner: 'После регистрации вы получите код класса — раздайте его ученикам.',
    email: 'Почта',
    password: 'Пароль',
    passwordHint: 'Не меньше 6 символов.',
    emailRequired: 'Введите почту.',
    passwordRequired: 'Введите пароль.',
    alreadyRegistered: 'Такая почта уже зарегистрирована — попробуйте войти.',
    weakPassword: 'Пароль слишком короткий: нужно не меньше 6 символов.',
    invalidEmail: 'Проверьте адрес почты.',
    rateLimit: 'Слишком много попыток. Подождите минуту.',
    domainBlocked: 'С этой почтой зарегистрироваться нельзя — домен не разрешён администратором.',
    genericSignUpError: 'Не удалось зарегистрироваться.',
    confirmEmailNotice:
      'Мы отправили письмо для подтверждения. Откройте ссылку из него, затем войдите — и мы спросим роль.',
    classNotFound: 'Класс с таким кодом не найден. Проверьте код у учителя.',
    classCodeRequired: 'Введите код класса.',
    genericProfileError: 'Не удалось создать профиль.',
    submit: 'Зарегистрироваться',
    or: 'или',
    haveAccount: 'Уже есть аккаунт?',
    login: 'Войти',
  },
  kk: {
    heroTitle: 'Бастауға дайынсыз ба?',
    heroFeatures: [
      'Не оқу керегін жүйе өзі шешеді',
      'ЖИ жауапты ойдан шығармай, есептелгенді түсіндіреді',
      'Жетістіктер мен мектеп рейтингі',
    ],
    title: 'Аккаунт құру',
    subtitle: 'Бірнеше өрісті толтырыңыз — қалғанын жүйе өзі жасайды.',
    name: 'Аты-жөні',
    namePlaceholder: 'Айсұлтан Жақыпов',
    nameHint: 'Нақты аты-жөні: сыныптастарыңыз сізді рейтингте осылай көреді.',
    roleLabel: 'Мен',
    student: 'Оқушы',
    teacher: 'Мұғалім',
    classCode: 'Сынып коды',
    classCodeHint: 'Сынып кодын сынып жетекшісінен алыңыз. Қолыңызда жоқ болса, кейінірек енгізуге болады.',
    teacherBanner: 'Тіркелгеннен кейін сынып кодын аласыз — оны оқушыларға таратыңыз.',
    email: 'Электрондық пошта',
    password: 'Құпия сөз',
    passwordHint: '6 таңбадан кем емес.',
    emailRequired: 'Поштаңызды енгізіңіз.',
    passwordRequired: 'Құпия сөзді енгізіңіз.',
    alreadyRegistered: 'Бұл пошта тіркелген — кіріп көріңіз.',
    weakPassword: 'Құпия сөз тым қысқа: 6 таңбадан кем болмауы керек.',
    invalidEmail: 'Пошта мекенжайын тексеріңіз.',
    rateLimit: 'Тым көп әрекет. Бір минуттан кейін қайталаңыз.',
    domainBlocked: 'Бұл поштамен тіркелу мүмкін емес — доменге әкімші рұқсат бермеген.',
    genericSignUpError: 'Тіркелу мүмкін болмады.',
    confirmEmailNotice:
      'Растау хатын жібердік. Хаттағы сілтемені ашып, содан кейін кіріңіз — рөліңізді сұраймыз.',
    classNotFound: 'Мұндай код бойынша сынып табылмады. Кодты мұғалімнен тексеріңіз.',
    classCodeRequired: 'Сынып кодын енгізіңіз.',
    genericProfileError: 'Профиль құру мүмкін болмады.',
    submit: 'Тіркелу',
    or: 'немесе',
    haveAccount: 'Аккаунтыңыз бар ма?',
    login: 'Кіру',
  },
  en: {
    heroTitle: 'Ready to start?',
    heroFeatures: [
      'The engine decides what to study next',
      'AI explains the solution instead of inventing one',
      'Achievements and a school leaderboard',
    ],
    title: 'Create an account',
    subtitle: 'Fill in a few fields — the system handles the rest.',
    name: 'Full name',
    namePlaceholder: 'Aisultan Zhakypov',
    nameHint: 'Your real name: classmates will see it on the leaderboard.',
    roleLabel: 'I am a',
    student: 'Student',
    teacher: 'Teacher',
    classCode: 'Class code',
    classCodeHint: "Get the class code from your homeroom teacher. Don't have it yet? You can add it later.",
    teacherBanner: "After signing up you'll get a class code — hand it out to your students.",
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 6 characters.',
    emailRequired: 'Enter your email.',
    passwordRequired: 'Enter your password.',
    alreadyRegistered: 'This email is already registered — try logging in.',
    weakPassword: 'Password is too short: at least 6 characters.',
    invalidEmail: 'Check your email address.',
    rateLimit: 'Too many attempts. Wait a minute.',
    domainBlocked: "You can't sign up with this email — the domain isn't allowed.",
    genericSignUpError: 'Could not sign up.',
    confirmEmailNotice: "We've sent a confirmation email. Open the link in it, then log in — we'll ask for your role.",
    classNotFound: 'No class found with that code. Check it with your teacher.',
    classCodeRequired: 'Enter the class code.',
    genericProfileError: 'Could not create the profile.',
    submit: 'Sign up',
    or: 'or',
    haveAccount: 'Already have an account?',
    login: 'Log in',
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const { signUpWithPassword, chooseRole, signInWithProvider } = useSchoolAuth();
  const lang = useLang();
  const t = TEXT[lang];
  const heroFeatures = HERO_ICONS.map((icon, i) => ({ icon, text: t.heroFeatures[i] }));

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

  function translateSignUpError(message: string): string {
    if (/already registered|already exists/i.test(message)) return t.alreadyRegistered;
    if (/password.*at least|weak password/i.test(message)) return t.weakPassword;
    if (/invalid email/i.test(message)) return t.invalidEmail;
    if (/rate limit|too many/i.test(message)) return t.rateLimit;
    /*
      Текст RLS наружу не пускаем ни при каких обстоятельствах: он всё равно
      ничего не объясняет человеку, а выглядит как поломка сайта.
    */
    if (/row-level security|violates/i.test(message)) return t.domainBlocked;
    return message;
  }

  function classCodeErrorText(code: string | undefined): string | undefined {
    if (code === 'class_not_found') return t.classNotFound;
    if (code === 'class_code_required') return t.classCodeRequired;
    return undefined;
  }

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
      setEmailError(t.emailRequired);
      hasError = true;
    }
    if (!password) {
      setPasswordError(t.passwordRequired);
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
      const message = translateSignUpError(signUp.error ?? t.genericSignUpError);
      /*
        Слабый пароль и занятая почта относятся к конкретным полям — но
        распознать это можно только по тексту ошибки, а не по коду:
        Supabase не различает их структурно в этом ответе.
      */
      if (message === t.weakPassword) setPasswordError(message);
      else if (message === t.alreadyRegistered || message === t.invalidEmail || message === t.domainBlocked) {
        setEmailError(message);
      } else {
        setFormError(message);
      }
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
      setNotice(t.confirmEmailNotice);
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
      const classMessage = classCodeErrorText(profile.error);
      if (classMessage) {
        setClassCodeError(classMessage);
      } else {
        setFormError(translateSignUpError(profile.error ?? t.genericProfileError));
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
      heroTitle={t.heroTitle}
      heroFeatures={heroFeatures}
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <>
          {t.haveAccount} <AuthLink href="/login">{t.login}</AuthLink>
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
          label={t.name}
          autoComplete="name"
          placeholder={t.namePlaceholder}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(undefined);
          }}
          hint={t.nameHint}
          error={nameError}
          shakeKey={shakeKey}
        />

        <SegmentedToggle
          label={t.roleLabel}
          value={role}
          onChange={setRole}
          options={[
            { value: 'student', label: t.student, icon: 'cap' },
            { value: 'teacher', label: t.teacher, icon: 'building' },
          ]}
        />

        {/* Код класса только у ученика: учитель класс создаёт, а не входит в него */}
        {role === 'student' && (
          <ClassCodeField
            label={t.classCode}
            value={classCode}
            onValueChange={(value) => {
              setClassCode(value);
              if (classCodeError) setClassCodeError(undefined);
            }}
            hint={t.classCodeHint}
            error={classCodeError}
            shakeKey={shakeKey}
          />
        )}

        {role === 'teacher' && <InfoBanner>{t.teacherBanner}</InfoBanner>}

        <Field
          label={t.email}
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
          label={t.password}
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

        {formError && <FormMessage tone="error">{formError}</FormMessage>}
        {notice && <FormMessage tone="success">{notice}</FormMessage>}

        <SubmitButton loading={status === 'loading'} success={status === 'success'}>
          {t.submit}
        </SubmitButton>
      </form>

      <div className="mt-7">
        <ProviderButtons dividerLabel={t.or} onGoogle={() => signInWithProvider('google', '/dashboard')} />
      </div>
    </AuthShell>
  );
}
