'use client';

/**
 * Коды ошибок создания профиля → текст для человека.
 *
 * Раньше каждый экран, вызывающий chooseRole, показывал то, что пришло от
 * сервера, как есть: на форме регистрации был разобран только код класса,
 * а баннер выбора роли и вовсе печатал сырую строку. Из-за этого
 * пользователь мог увидеть на экране «class_not_found» или дословный
 * текст Postgres про row-level security.
 *
 * Список общий, потому что экранов с выбором роли три (регистрация,
 * баннер на лендинге и ворота публикации), и расходиться в формулировках
 * им незачем.
 */

import { domainRejectionMessage } from './allowedDomains';

const MESSAGES: Record<string, string> = {
  class_not_found: 'Класс с таким кодом не найден. Проверьте код у учителя.',
  class_code_required: 'Введите код класса — его даёт учитель.',
  class_code_collision: 'Не удалось выдать код класса. Попробуйте ещё раз.',
  invalid_role: 'Выберите, кто вы: ученик или учитель.',
  not_authenticated: 'Сессия истекла — войдите заново.',
  invalid_body: 'Не удалось отправить данные. Обновите страницу и попробуйте снова.',
};

export function describeRoleError(error?: string, domains?: string[]): string {
  if (!error) return 'Не удалось создать профиль.';
  if (error === 'domain_not_allowed') return domainRejectionMessage(domains ?? []);
  if (MESSAGES[error]) return MESSAGES[error];
  /*
    Страховка на случай, если база ответит текстом, а не кодом: показывать
    человеку формулировки Postgres нельзя ни при каких обстоятельствах —
    они выглядят как поломка сайта и ничего не объясняют.
  */
  if (/row-level security|violates|constraint/i.test(error)) {
    return 'С этой почтой создать профиль нельзя — домен не разрешён администратором.';
  }
  return error;
}
