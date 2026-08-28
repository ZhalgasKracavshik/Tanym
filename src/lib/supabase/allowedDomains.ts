'use client';

/**
 * Домены почты, с которых разрешено заводить профиль.
 *
 * Список лежит в таблице allowed_school_domains и читается публично —
 * поэтому клиент может спросить его до регистрации, а не узнавать об
 * ограничении из ошибки базы после создания учётной записи.
 *
 * Почему это важно проверять заранее. Регистрация состоит из двух шагов:
 * сначала Supabase заводит пользователя, потом мы создаём ему профиль.
 * Ограничение на домен живёт только на втором шаге (RLS), поэтому при
 * неподходящем адресе первый шаг успевал пройти, а второй падал — и
 * человек оставался учётной записью без профиля: войти может, а
 * пользоваться ничем не может, и повторная регистрация ему уже отвечает
 * «почта занята». В проде на этом застрял живой пользователь. Проверка
 * до signUp закрывает саму возможность такого состояния.
 *
 * Список копией в коде не держим: он изменится в базе, а копия молча
 * останется старой.
 */

import { createClient } from './client';

export interface AllowedDomain {
  domain: string;
  /** С этого домена можно регистрироваться учителем, а не только учеником. */
  allowsTeacher: boolean;
}

export async function fetchAllowedDomainRows(): Promise<AllowedDomain[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('allowed_school_domains')
      .select('domain, allows_teacher');
    if (error) return [];
    return (data ?? []).map((row) => ({
      domain: String(row.domain).toLowerCase(),
      allowsTeacher: Boolean(row.allows_teacher),
    }));
  } catch {
    return [];
  }
}

export async function fetchAllowedDomains(): Promise<string[]> {
  return (await fetchAllowedDomainRows()).map((row) => row.domain);
}

/** Домены, с которых разрешена роль учителя. */
export function teacherDomains(rows: AllowedDomain[]): string[] {
  return rows.filter((row) => row.allowsTeacher).map((row) => row.domain);
}

/**
 * Пустой список снова означает «не смогли прочитать»: пропускаем дальше,
 * решение всё равно за политикой в базе.
 */
export function canBeTeacher(email: string, rows: AllowedDomain[]): boolean {
  if (rows.length === 0) return true;
  const address = email.trim().toLowerCase();
  return rows.some((row) => row.allowsTeacher && address.endsWith(`@${row.domain}`));
}

export function teacherDomainMessage(rows: AllowedDomain[]): string {
  const list = formatDomains(teacherDomains(rows));
  return list
    ? `Учителем можно зарегистрироваться только со школьной почты на ${list}. С личной почты доступна регистрация ученика.`
    : 'Учителем можно зарегистрироваться только со школьной почты.';
}

/**
 * Пустой список означает «не смогли прочитать», а не «ничего не разрешено».
 *
 * Сеть могла не ответить, и в этом случае честнее пропустить человека
 * дальше: на втором шаге его всё равно проверит база. Обратное поведение
 * заблокировало бы регистрацию вообще всем при первом сбое запроса.
 */
export function isEmailDomainAllowed(email: string, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const address = email.trim().toLowerCase();
  return domains.some((domain) => address.endsWith(`@${domain}`));
}

/** «binom.edu.kz или gmail.com» — для подстановки в текст сообщения. */
export function formatDomains(domains: string[]): string {
  if (domains.length === 0) return '';
  if (domains.length === 1) return domains[0];
  return `${domains.slice(0, -1).join(', ')} или ${domains[domains.length - 1]}`;
}

export function domainRejectionMessage(domains: string[]): string {
  const list = formatDomains(domains);
  return list
    ? `Регистрация доступна только с почтой на ${list}. Если у вашей школы другой домен — напишите нам, мы его добавим.`
    : 'С этой почтой зарегистрироваться нельзя — домен не разрешён администратором.';
}
