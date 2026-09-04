/**
 * Проверка заданий, которые составляет учитель.
 *
 * Зачем отдельный модуль, а не проверка прямо в форме. Во-первых, те же
 * правила должен применять сервер: форму можно обойти, отправив запрос
 * напрямую, и тогда в базу ляжет задание, на котором ученик застрянет.
 * Во-вторых, эти правила проверяются тестами, а разметку тестировать
 * неудобно.
 *
 * Главная проверка здесь — та, из-за которой модуль вообще появился:
 * эталонный ответ обязан проходить собственную проверку. Звучит как
 * тавтология, но именно так ломается задание в реальности: автор пишет
 * ответ «x = 5», а сравнение идёт по числу, и ученик, ответивший 5,
 * получает «неверно». Такое задание выглядит рабочим до первого ученика.
 */

import { checkAnswer, normalizeNumeric } from './grading';
import type { Difficulty, Language, Task } from './types';

/** Черновик задания из формы: ещё не Task, поля могут быть пустыми. */
export interface TaskDraft {
  kind: 'single' | 'numeric';
  prompt: string;
  options: string[];
  correctIndex: number;
  correctValue: string;
  hint: string;
  explanation: string;
  skillId: string;
  difficulty: Difficulty;
}

export type TaskProblemCode =
  | 'prompt-empty'
  | 'prompt-short'
  | 'skill-missing'
  | 'explanation-empty'
  | 'explanation-short'
  | 'options-few'
  | 'options-empty'
  | 'options-duplicate'
  | 'correct-index-out-of-range'
  | 'value-empty'
  | 'value-not-number'
  | 'self-check-failed';

export interface TaskProblem {
  code: TaskProblemCode;
  /** Номер варианта ответа — только там, где проблема относится к варианту. */
  option?: number;
}

const MIN_PROMPT = 8;
const MIN_EXPLANATION = 20;
const MIN_OPTIONS = 2;

export const TASK_LIMITS = {
  prompt: 400,
  option: 120,
  hint: 200,
  explanation: 1200,
  optionsMax: 6,
} as const;

/**
 * Собирает Task из черновика. Возвращает задание даже если оно с
 * проблемами: проверка и сборка — разные обязанности, и вызывающий сам
 * решает, что делать с результатом.
 */
export function draftToTask(draft: TaskDraft, topicId: string, index: number): Task {
  const base = {
    id: `${topicId}.t${index + 1}`,
    topicId,
    skillId: draft.skillId,
    difficulty: draft.difficulty,
    prompt: draft.prompt.trim().slice(0, TASK_LIMITS.prompt),
    hint: draft.hint.trim().slice(0, TASK_LIMITS.hint),
    explanation: draft.explanation.trim().slice(0, TASK_LIMITS.explanation),
  };

  if (draft.kind === 'numeric') {
    return { ...base, kind: 'numeric', correctValue: draft.correctValue.trim() };
  }

  return {
    ...base,
    kind: 'single',
    options: draft.options.map((option) => option.trim().slice(0, TASK_LIMITS.option)),
    correctIndex: draft.correctIndex,
  };
}

/** Что именно нужно ввести, чтобы задание засчиталось верным. */
function referenceInput(task: Task): string | null {
  if (task.kind === 'single') {
    return task.correctIndex === undefined ? null : String(task.correctIndex);
  }
  return task.correctValue ?? null;
}

export function validateTask(draft: TaskDraft): TaskProblem[] {
  const problems: TaskProblem[] = [];
  const prompt = draft.prompt.trim();
  const explanation = draft.explanation.trim();

  if (prompt === '') problems.push({ code: 'prompt-empty' });
  else if (prompt.length < MIN_PROMPT) problems.push({ code: 'prompt-short' });

  if (!draft.skillId) problems.push({ code: 'skill-missing' });

  /*
    Разбор обязателен и не для красоты: на него опирается объяснение
    модели и он же показывается, когда модель недоступна. Задание без
    разбора превращает ошибку ученика в тупик «неверно, разбирайся сам».
  */
  if (explanation === '') problems.push({ code: 'explanation-empty' });
  else if (explanation.length < MIN_EXPLANATION) problems.push({ code: 'explanation-short' });

  if (draft.kind === 'single') {
    const filled = draft.options.map((option) => option.trim());
    const nonEmpty = filled.filter((option) => option !== '');

    if (nonEmpty.length < MIN_OPTIONS) problems.push({ code: 'options-few' });

    filled.forEach((option, index) => {
      if (option === '' && index < nonEmpty.length) problems.push({ code: 'options-empty', option: index });
    });

    /*
      Два одинаковых варианта — не придирка: ученик выбирает верный по
      тексту, а засчитывается только один индекс. Второй такой же вариант
      делает задание нечестным при полностью правильном рассуждении.
    */
    const seen = new Set<string>();
    nonEmpty.forEach((option, index) => {
      const key = option.toLowerCase();
      if (seen.has(key)) problems.push({ code: 'options-duplicate', option: index });
      seen.add(key);
    });

    if (draft.correctIndex < 0 || draft.correctIndex >= nonEmpty.length) {
      problems.push({ code: 'correct-index-out-of-range' });
    }
  } else {
    const value = draft.correctValue.trim();
    if (value === '') {
      problems.push({ code: 'value-empty' });
    } else if (!Number.isFinite(Number(normalizeNumeric(value)))) {
      /*
        Числовой ответ сравнивается как число. «x = 5» сюда не годится:
        ученик введёт 5, сравнение не сойдётся, и он получит «неверно» за
        верный ответ. Это ровно тот случай, ради которого модуль и написан.
      */
      problems.push({ code: 'value-not-number' });
    }
  }

  /*
    Последняя и самая важная проверка: прогоняем эталон через ту же
    функцию, которой будет проверяться ответ ученика. Если не сошлось —
    задание сломано, сколько бы правильно ни выглядели остальные поля.
  */
  if (problems.length === 0) {
    const task = draftToTask(draft, 'validation', 0);
    const reference = referenceInput(task);
    if (reference === null || !checkAnswer(task, reference)) {
      problems.push({ code: 'self-check-failed' });
    }
  }

  return problems;
}

const MESSAGES: Record<Language, Record<TaskProblemCode, string>> = {
  ru: {
    'prompt-empty': 'Напишите условие задания',
    'prompt-short': 'Условие слишком короткое — ученик не поймёт, что от него хотят',
    'skill-missing': 'Выберите навык: без него прогресс ученика некуда засчитать',
    'explanation-empty': 'Напишите разбор: его показывают после ответа и на него опирается наставник',
    'explanation-short': 'Разбор слишком короткий, чтобы объяснить решение',
    'options-few': 'Нужно хотя бы два варианта ответа',
    'options-empty': 'Пустой вариант посреди списка',
    'options-duplicate': 'Такой вариант уже есть — засчитается только один',
    'correct-index-out-of-range': 'Отметьте, какой вариант верный',
    'value-empty': 'Укажите правильный ответ',
    'value-not-number': 'Ответ сравнивается как число. Напишите только значение: 5, а не «x = 5»',
    'self-check-failed': 'Правильный ответ не проходит собственную проверку — ученик ответит верно и получит «неверно»',
  },
  kk: {
    'prompt-empty': 'Тапсырма шартын жазыңыз',
    'prompt-short': 'Шарт тым қысқа — оқушы одан не талап етілетінін түсінбейді',
    'skill-missing': 'Дағдыны таңдаңыз: онсыз оқушының прогресін тіркеуге болмайды',
    'explanation-empty': 'Талдау жазыңыз: ол жауаптан кейін көрсетіледі, тәлімгер де соған сүйенеді',
    'explanation-short': 'Талдау шешімді түсіндіру үшін тым қысқа',
    'options-few': 'Кемінде екі жауап нұсқасы қажет',
    'options-empty': 'Тізім ортасында бос нұсқа тұр',
    'options-duplicate': 'Мұндай нұсқа бар — тек біреуі есептеледі',
    'correct-index-out-of-range': 'Қай нұсқа дұрыс екенін белгілеңіз',
    'value-empty': 'Дұрыс жауапты көрсетіңіз',
    'value-not-number': 'Жауап сан ретінде салыстырылады. Тек мәнін жазыңыз: 5, «x = 5» емес',
    'self-check-failed': 'Дұрыс жауап өз тексерісінен өтпейді — оқушы дұрыс жауап беріп, «қате» алады',
  },
  en: {
    'prompt-empty': 'Write the question',
    'prompt-short': 'The question is too short for a student to know what is being asked',
    'skill-missing': 'Pick a skill — without one there is nowhere to record progress',
    'explanation-empty': 'Write the solution: students see it after answering and the mentor builds on it',
    'explanation-short': 'The solution is too short to explain anything',
    'options-few': 'At least two answer options are needed',
    'options-empty': 'An empty option in the middle of the list',
    'options-duplicate': 'This option already exists — only one will count',
    'correct-index-out-of-range': 'Mark which option is correct',
    'value-empty': 'Enter the correct answer',
    'value-not-number': 'The answer is compared as a number. Write just the value: 5, not "x = 5"',
    'self-check-failed': 'The correct answer fails its own check — a student would answer correctly and be told otherwise',
  },
};

export function problemText(problem: TaskProblem, language: Language): string {
  const base = MESSAGES[language][problem.code];
  return problem.option === undefined ? base : `${problem.option + 1}. ${base}`;
}
