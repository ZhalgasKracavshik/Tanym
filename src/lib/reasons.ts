/**
 * Формулировка причин, по которым тема попала в план.
 *
 * Отдельный модуль, потому что причины нужны в двух совсем разных местах
 * и на разных языках: ученику — на языке интерфейса, модели — всегда
 * по-русски (учебный контент русский, и промпт остаётся однородным).
 *
 * Движок персонализации текст не собирает вовсе. Раньше собирал, и
 * результат был виден сразу: на казахской странице посреди переведённого
 * интерфейса стояло «Слабое место: тема освоена на 0%». Движок считает
 * числа, а язык — забота того, кто показывает.
 */

import type { Language, LearningGoal, TopicReason } from './types';

/** Название цели в родительном падеже: «подходит для ___». */
const GOAL: Record<Language, Record<LearningGoal, string>> = {
  ru: {
    ent: 'подготовки к ЕНТ',
    tzhb: 'суммативной работы',
    olympiad: 'олимпиады',
    sat: 'подготовки к SAT',
    nis: 'отбора в НИШ или БИЛ',
    review: 'повторения',
    catchup: 'закрытия пробелов',
    interest: 'изучения предмета',
    custom: 'вашей цели',
  },
  kk: {
    ent: 'ҰБТ-ға дайындыққа',
    tzhb: 'жиынтық жұмысқа',
    olympiad: 'олимпиадаға',
    sat: 'SAT-қа дайындыққа',
    nis: 'НЗМ немесе БИЛ іріктеуіне',
    review: 'қайталауға',
    catchup: 'олқылықты жабуға',
    interest: 'пәнді меңгеруге',
    custom: 'сіздің мақсатыңызға',
  },
  en: {
    ent: 'UNT preparation',
    tzhb: 'summative assessment',
    olympiad: 'olympiads',
    sat: 'SAT preparation',
    nis: 'NIS or BIL selection',
    review: 'revision',
    catchup: 'closing gaps',
    interest: 'learning the subject',
    custom: 'your goal',
  },
};

const TEXT: Record<Language, Record<TopicReason['kind'], (r: TopicReason) => string>> = {
  ru: {
    weak: (r) => `Слабое место: тема освоена на ${'percent' in r ? r.percent : 0}%`,
    growing: (r) => `Есть куда расти: тема освоена на ${'percent' in r ? r.percent : 0}%`,
    mastered: (r) => `Тема уже освоена на ${'percent' in r ? r.percent : 0}%, можно закрепить`,
    started: () => 'Вы уже начали эту тему, стоит довести до конца',
    'prereq-missing': () => 'Сначала лучше подтянуть темы-предпосылки',
    'prereq-done': () => 'Все базовые темы для неё уже пройдены',
    'fits-goal': (r) => `Уровень сложности подходит для ${GOAL.ru[('goal' in r ? r.goal : 'ent')]}`,
  },
  kk: {
    weak: (r) => `Осал тұс: тақырып ${'percent' in r ? r.percent : 0}% меңгерілген`,
    growing: (r) => `Өсуге орын бар: тақырып ${'percent' in r ? r.percent : 0}% меңгерілген`,
    mastered: (r) => `Тақырып ${'percent' in r ? r.percent : 0}% меңгерілген, бекітуге болады`,
    started: () => 'Бұл тақырыпты бастағансыз, аяғына жеткізген жөн',
    'prereq-missing': () => 'Алдымен алғышарт тақырыптарын пысықтаған жөн',
    'prereq-done': () => 'Оған қажет негізгі тақырыптар өтілген',
    'fits-goal': (r) => `Қиындық деңгейі ${GOAL.kk[('goal' in r ? r.goal : 'ent')]} сай келеді`,
  },
  en: {
    weak: (r) => `Weak spot: ${'percent' in r ? r.percent : 0}% mastered`,
    growing: (r) => `Room to grow: ${'percent' in r ? r.percent : 0}% mastered`,
    mastered: (r) => `Already ${'percent' in r ? r.percent : 0}% mastered, worth reinforcing`,
    started: () => 'You have started this topic — worth finishing',
    'prereq-missing': () => 'Better to cover the prerequisite topics first',
    'prereq-done': () => 'All prerequisite topics are already done',
    'fits-goal': (r) => `Difficulty suits ${GOAL.en[('goal' in r ? r.goal : 'ent')]}`,
  },
};

export function reasonText(reason: TopicReason, language: Language): string {
  return TEXT[language][reason.kind](reason);
}

/** Список причин одной строкой — для карточки темы и для промпта. */
export function reasonList(reasons: TopicReason[], language: Language, separator = ' · '): string {
  return reasons.map((reason) => reasonText(reason, language)).join(separator);
}
