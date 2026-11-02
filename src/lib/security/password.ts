/**
 * Проверка пароля до отправки в Supabase.
 *
 * Зачем своя. Встроенная в Supabase защита от утёкших паролей (HaveIBeenPwned)
 * есть только на платном тарифе Pro. Тот же открытый API можно спросить из
 * браузера бесплатно и без раскрытия пароля: уходит только первые 5 символов
 * SHA-1-хеша (k-анонимность), сравнение остатка — у нас на клиенте.
 *
 * Это не замена серверной проверке: обойти форму можно. Но ученики — это
 * дети, которые чаще всего берут «qwerty123» или пароль от игры, и этот
 * барьер срабатывает ровно там, где пароль придумывают.
 *
 * Минимальную длину на сервере задаёт Supabase (Auth → Providers → Email →
 * Minimum password length): держите там то же число, что и здесь.
 */

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordProblem = 'short' | 'simple';

/**
 * Явно слабый пароль: короткий, одна и та же цифра/буква, последовательность
 * или совпадает с почтой. Утечки проверяются отдельно — это сеть.
 */
export function passwordProblem(password: string, email = ''): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'short';
  const lower = password.toLowerCase();
  if (/^(.)\1+$/.test(lower)) return 'simple';
  const sequences = ['0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'йцукенгшщзхъ'];
  if (sequences.some((seq) => seq.includes(lower))) return 'simple';
  const login = email.split('@')[0]?.toLowerCase() ?? '';
  if (login.length >= 4 && lower.includes(login)) return 'simple';
  return null;
}

/** Сколько раз хвост хеша встречается в ответе диапазона HIBP (0 — не встречался). */
export function pwnedCountFromRange(rangeText: string, suffix: string): number {
  const wanted = suffix.toUpperCase();
  for (const line of rangeText.split('\n')) {
    const [hashSuffix, count] = line.trim().split(':');
    if (hashSuffix?.toUpperCase() === wanted) return Number(count) || 0;
  }
  return 0;
}

async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * true — пароль есть в базах утечек. Если API недоступен или отвечает
 * долго, возвращаем false: регистрацию из-за чужого сервиса не блокируем.
 */
export async function isPasswordPwned(password: string, timeoutMs = 3000): Promise<boolean> {
  try {
    const hash = await sha1Hex(password);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!response.ok) return false;
    return pwnedCountFromRange(await response.text(), hash.slice(5)) > 0;
  } catch {
    return false;
  }
}

/** Тексты ошибок на трёх языках — одни и те же для регистрации, сброса и профиля. */
export const PASSWORD_TEXT = {
  ru: {
    hint: `Не меньше ${MIN_PASSWORD_LENGTH} символов. Не используйте пароль от других сайтов.`,
    short: `Пароль слишком короткий: нужно не меньше ${MIN_PASSWORD_LENGTH} символов.`,
    simple: 'Такой пароль легко угадать. Добавьте слова, цифры или знаки.',
    pwned: 'Этот пароль уже есть в базах утечек — его подбирают первым. Придумайте другой.',
  },
  kk: {
    hint: `Кемінде ${MIN_PASSWORD_LENGTH} таңба. Басқа сайттардағы құпия сөзді қолданбаңыз.`,
    short: `Құпия сөз тым қысқа: кемінде ${MIN_PASSWORD_LENGTH} таңба керек.`,
    simple: 'Мұндай құпия сөзді табу оңай. Сөз, сан немесе белгі қосыңыз.',
    pwned: 'Бұл құпия сөз деректер жылыстауында бар — оны бірінші болып тексереді. Басқасын ойлап табыңыз.',
  },
  en: {
    hint: `At least ${MIN_PASSWORD_LENGTH} characters. Don't reuse a password from other sites.`,
    short: `Password is too short: at least ${MIN_PASSWORD_LENGTH} characters.`,
    simple: 'This password is easy to guess. Add words, digits or symbols.',
    pwned: 'This password appears in known data breaches and is tried first by attackers. Pick another one.',
  },
} as const;

/** Полная проверка: локальные правила, затем утечки. Возвращает текст ошибки или null. */
export async function checkNewPassword(
  password: string,
  language: keyof typeof PASSWORD_TEXT,
  email = '',
): Promise<string | null> {
  const t = PASSWORD_TEXT[language] ?? PASSWORD_TEXT.ru;
  const problem = passwordProblem(password, email);
  if (problem) return t[problem];
  if (await isPasswordPwned(password)) return t.pwned;
  return null;
}
