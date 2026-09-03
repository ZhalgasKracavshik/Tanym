/**
 * Учебный контент по английскому языку для 7–11 классов
 * (программа школ Казахстана).
 *
 * Структура файла повторяет тип Subject: сначала навыки, потом темы с теорией
 * и заданиями, в конце — диагностический тест.
 *
 * Особенность предмета по сравнению с математикой и физикой: ответы здесь
 * текстовые, а не числовые. Проверка это выдерживает — нормализация ответа
 * приводит его к нижнему регистру и убирает пробелы, поэтому «Went», «went»
 * и « WENT » засчитываются одинаково, а ответ из двух слов сравнивается
 * целиком. Тем не менее свободный ввод используется только там, где верный
 * ответ ровно один: «поставьте глагол в прошедшем времени». Везде, где
 * допустимы синонимичные формулировки, стоит выбор варианта — иначе ученик
 * терял бы балл за правильный по смыслу ответ.
 *
 * Объяснения и подсказки написаны по-русски: язык интерфейса и объяснений
 * отделён от языка изучаемого материала, как и в школьном учебнике.
 */

import type { Subject } from '@/lib/types';

export const english: Subject = {
  id: 'english',
  title: 'Английский язык',
  shortTitle: 'Английский',
  description:
    'Грамматика, на которой держится язык: времена, артикли, модальные глаголы, условные предложения и пассивный залог.',
  icon: 'english',
  accent: 'var(--color-subject-english)',
  grades: [7, 8, 9, 10, 11],

  /* ---------------------------------------------------------------- */
  /*  Навыки                                                           */
  /* ---------------------------------------------------------------- */

  skills: [
    {
      id: 'english.present-simple',
      subjectId: 'english',
      title: 'Present Simple: форма, окончание -s и вспомогательные глаголы',
      grades: [7, 8],
    },
    {
      id: 'english.present-continuous',
      subjectId: 'english',
      title: 'Present Continuous и выбор между ним и Present Simple',
      grades: [7, 8, 9],
    },
    {
      id: 'english.past-simple',
      subjectId: 'english',
      title: 'Past Simple: правильные глаголы и вспомогательный did',
      grades: [7, 8, 9],
    },
    {
      id: 'english.irregular-verbs',
      subjectId: 'english',
      title: 'Неправильные глаголы и их вторая форма',
      grades: [7, 8, 9, 10],
    },
    {
      id: 'english.present-perfect',
      subjectId: 'english',
      title: 'Present Perfect и его отличие от Past Simple',
      grades: [8, 9, 10, 11],
    },
    {
      id: 'english.future-forms',
      subjectId: 'english',
      title: 'Будущее время: will и be going to',
      grades: [8, 9, 10],
    },
    {
      id: 'english.articles',
      subjectId: 'english',
      title: 'Артикли a, an и the',
      grades: [7, 8, 9],
    },
    {
      id: 'english.comparatives',
      subjectId: 'english',
      title: 'Степени сравнения прилагательных',
      grades: [7, 8, 9],
    },
    {
      id: 'english.modals',
      subjectId: 'english',
      title: 'Модальные глаголы can, must, should, have to',
      grades: [8, 9, 10],
    },
    {
      id: 'english.conditionals',
      subjectId: 'english',
      title: 'Условные предложения нулевого, первого и второго типа',
      grades: [9, 10, 11],
    },
    {
      id: 'english.passive',
      subjectId: 'english',
      title: 'Пассивный залог и его образование',
      grades: [9, 10, 11],
    },
    {
      id: 'english.word-order',
      subjectId: 'english',
      title: 'Порядок слов в утверждении, отрицании и вопросе',
      grades: [7, 8, 9],
    },
  ],

  /* ---------------------------------------------------------------- */
  /*  Темы                                                             */
  /* ---------------------------------------------------------------- */

  topics: [
    {
      id: 'english.present-simple',
      subjectId: 'english',
      title: 'Present Simple и порядок слов',
      summary:
        'Когда употребляется Present Simple, откуда берётся окончание -s и как строить отрицание и вопрос с do и does.',
      grades: [7, 8],
      difficulty: 1,
      skills: ['english.present-simple', 'english.word-order'],
      prerequisites: [],
      estimatedMinutes: 25,
      material: {
        intro:
          'Present Simple — первое время, которое изучают, и самое частое в речи. Оно описывает не то, что происходит сейчас, а то, что происходит вообще: привычки, расписания, факты. Главная сложность для говорящих по-русски в том, что в английском предложении обязателен строгий порядок слов и вспомогательный глагол там, где в русском ничего подобного нет.',
        sections: [
          {
            heading: 'Когда употребляется',
            body:
              'Present Simple описывает регулярные действия (I go to school every day), постоянные состояния и общеизвестные факты (Water boils at 100 degrees), а также расписания (The train leaves at seven). Характерные слова-спутники: always, usually, often, sometimes, never, every day, on Mondays. Если в предложении есть одно из них, почти наверняка нужен Present Simple.',
          },
          {
            heading: 'Окончание -s в третьем лице',
            body:
              'В утвердительном предложении глагол получает окончание -s или -es, если подлежащее — he, she или it. He works, she goes, it rains. Это единственное изменение глагола во всём времени, и именно его чаще всего забывают. Если основа заканчивается на -o, -ch, -sh, -x или -ss, добавляют -es: goes, watches, washes. Если на согласную с -y, то y меняется на i и добавляется -es: study — studies.',
            formula: 'I / you / we / they + глагол; he / she / it + глагол + s',
          },
          {
            heading: 'Отрицание и вопрос',
            body:
              'Отрицание и вопрос строятся с помощью вспомогательного глагола do (does для he, she, it). Ключевое правило: вспомогательный глагол забирает окончание -s себе, а смысловой возвращается в начальную форму. She works, но She does not work и Does she work? Писать does she works — самая распространённая ошибка. Порядок слов в вопросе жёсткий: вспомогательный глагол, подлежащее, смысловой глагол.',
            formula: 'Do / Does + подлежащее + глагол в начальной форме? He does not play. Does he play?',
          },
        ],
        keyPoints: [
          'Present Simple — про регулярность и факты, а не про момент речи.',
          'Окончание -s появляется только у he, she, it и только в утверждении.',
          'В отрицании и вопросе окончание переходит к does, а глагол теряет -s.',
          'Порядок слов в вопросе: вспомогательный глагол, подлежащее, смысловой глагол.',
          'Слова-спутники: always, usually, often, never, every day.',
        ],
        examples: [
          {
            problem: 'Поставьте предложение в отрицательную форму: She watches TV every evening.',
            solution:
              'Шаг 1. Определяем подлежащее: she — третье лицо единственного числа.\nШаг 2. Значит вспомогательный глагол does.\nШаг 3. Ставим отрицание: does not (сокращённо doesn’t).\nШаг 4. Смысловой глагол возвращаем в начальную форму: watches становится watch.\nОтвет: She does not watch TV every evening. Оставить watches здесь нельзя — окончание уже забрал does.',
          },
          {
            problem: 'Постройте вопрос: They live in Astana.',
            solution:
              'Шаг 1. Подлежащее they, значит вспомогательный глагол do.\nШаг 2. Порядок слов в вопросе: вспомогательный глагол на первое место.\nШаг 3. Затем подлежащее, затем смысловой глагол в начальной форме.\nОтвет: Do they live in Astana? Обратите внимание: в русском вопрос отличается только интонацией, а в английском обязательно меняется структура.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.present-simple.t1',
          topicId: 'english.present-simple',
          skillId: 'english.present-simple',
          difficulty: 1,
          kind: 'single',
          prompt: 'Выберите правильный вариант: She ___ to school every day.',
          options: ['go', 'goes', 'going', 'is go'],
          correctIndex: 1,
          hint: 'Подлежащее she — третье лицо единственного числа. Что происходит с глаголом в утверждении?',
          explanation:
            'Подлежащее she относится к третьему лицу единственного числа, поэтому в утвердительном предложении Present Simple глагол получает окончание.\nОснова go заканчивается на -o, значит добавляется -es: goes.\nВариант go подошёл бы к I, you, we, they.\nGoing — форма для Present Continuous, is go грамматически невозможно.\nОтвет: goes.',
        },
        {
          id: 'english.present-simple.t2',
          topicId: 'english.present-simple',
          skillId: 'english.present-simple',
          difficulty: 2,
          kind: 'single',
          prompt: 'Выберите правильное отрицание: He ___ like coffee.',
          options: ["doesn't", "don't", "isn't", "not"],
          correctIndex: 0,
          hint: 'Для he, she, it вспомогательный глагол принимает особую форму.',
          explanation:
            'Отрицание в Present Simple строится вспомогательным глаголом do.\nДля третьего лица единственного числа он принимает форму does, с отрицанием — doesn’t.\nDon’t используется с I, you, we, they.\nIsn’t — форма глагола be, а здесь смысловой глагол like.\nОтвет: doesn’t. Полностью: He doesn’t like coffee.',
        },
        {
          id: 'english.present-simple.t3',
          topicId: 'english.present-simple',
          skillId: 'english.word-order',
          difficulty: 2,
          kind: 'single',
          prompt: 'Какой вопрос построен правильно?',
          options: [
            'Does she works here?',
            'Does she work here?',
            'She does work here?',
            'Do she work here?',
          ],
          correctIndex: 1,
          hint: 'Вспомогательный глагол забирает окончание себе. Что остаётся смысловому глаголу?',
          explanation:
            'В вопросе вспомогательный глагол does стоит первым, затем подлежащее, затем смысловой глагол в начальной форме.\nОкончание -s уже «ушло» в does, поэтому works здесь неверно — это самая частая ошибка.\nВариант She does work here? нарушает порядок слов.\nDo she — неверная форма для третьего лица.\nОтвет: Does she work here?',
        },
        {
          id: 'english.present-simple.t4',
          topicId: 'english.present-simple',
          skillId: 'english.present-simple',
          difficulty: 3,
          kind: 'numeric',
          prompt:
            'Поставьте глагол в правильную форму Present Simple: My brother ___ (study) at university. Ответ дайте одним словом.',
          correctValue: 'studies',
          hint: 'Основа заканчивается на согласную и -y. Что происходит с этой y перед окончанием?',
          explanation:
            'Подлежащее my brother — это he, третье лицо единственного числа, значит нужно окончание.\nОснова study заканчивается на согласную d плюс y.\nВ таком случае y меняется на i и добавляется -es.\nПолучается studies.\nОтвет: studies. Если бы перед y стояла гласная (play), то просто добавили бы -s: plays.',
        },
        {
          id: 'english.present-simple.t5',
          topicId: 'english.present-simple',
          skillId: 'english.present-simple',
          difficulty: 3,
          kind: 'single',
          prompt:
            'В каком предложении Present Simple употреблён верно по смыслу?',
          options: [
            'Look! She reads a book right now.',
            'The Earth goes around the Sun.',
            'I read a book at this moment.',
            'They play football now.',
          ],
          correctIndex: 1,
          hint: 'Present Simple описывает не момент речи, а факты и регулярность.',
          explanation:
            'Present Simple используется для общеизвестных фактов и регулярных действий.\nThe Earth goes around the Sun — научный факт, время выбрано верно.\nВ остальных вариантах есть указания на момент речи (right now, at this moment, now), а для действий в момент речи нужен Present Continuous: She is reading, I am reading, They are playing.\nОтвет: The Earth goes around the Sun.',
        },
      ],
    },

    {
      id: 'english.continuous',
      subjectId: 'english',
      title: 'Present Continuous и выбор времени',
      summary:
        'Как образуется Present Continuous, когда он нужен вместо Present Simple и какие глаголы в нём не употребляются.',
      grades: [7, 8, 9],
      difficulty: 2,
      skills: ['english.present-continuous'],
      prerequisites: ['english.present-simple'],
      estimatedMinutes: 25,
      material: {
        intro:
          'Если Present Simple описывает жизнь вообще, то Present Continuous — то, что разворачивается прямо сейчас. Для говорящих по-русски это непривычно: в русском одна форма «читаю» покрывает оба смысла, и выбор между временами приходится делать сознательно. Ориентироваться надо не на перевод, а на ситуацию.',
        sections: [
          {
            heading: 'Образование',
            body:
              'Present Continuous строится из глагола be в нужной форме и смыслового глагола с окончанием -ing: I am reading, he is reading, they are reading. Отрицание получают добавлением not к глаголу be, а вопрос — перестановкой be на первое место. Никакого do здесь не появляется: вспомогательным уже служит be.',
            formula: 'am / is / are + глагол + ing; вопрос: Is he reading?',
          },
          {
            heading: 'Когда употребляется',
            body:
              'Основное значение — действие в момент речи: Look, it is raining. Второе значение — действие в текущий период, не обязательно в эту секунду: I am reading an interesting book these days. Третье — запланированное будущее с указанием времени: We are meeting at six tomorrow. Слова-спутники: now, at the moment, right now, look, listen.',
          },
          {
            heading: 'Глаголы, которые не ставят в Continuous',
            body:
              'Часть глаголов описывает не действие, а состояние, и в Continuous обычно не употребляется: like, love, hate, want, need, know, understand, remember, see, hear, belong. Нельзя сказать I am knowing the answer — правильно I know the answer. Это правило объясняет большинство ошибок в теме: ученик видит слово now и машинально ставит Continuous, не проверив, действие перед ним или состояние.',
            formula: 'Состояния (know, like, want, understand) — только Present Simple',
          },
        ],
        keyPoints: [
          'Present Continuous = am / is / are + глагол с -ing.',
          'Он описывает момент речи или текущий период, а не привычку.',
          'В вопросе и отрицании do не используется — работает be.',
          'Глаголы состояния (know, like, want) в Continuous не ставятся.',
          'Слова-спутники: now, at the moment, look, listen.',
        ],
        examples: [
          {
            problem: 'Выберите верную форму: Listen! Somebody ___ (sing).',
            solution:
              'Шаг 1. Слово Listen указывает на момент речи, значит нужен Present Continuous.\nШаг 2. Подлежащее somebody считается единственным числом, значит форма be — is.\nШаг 3. К глаголу добавляем -ing: singing.\nОтвет: Listen! Somebody is singing.',
          },
          {
            problem: 'Почему нельзя сказать I am knowing this rule?',
            solution:
              'Шаг 1. Смотрим на глагол know: он описывает состояние, а не действие.\nШаг 2. Состояние нельзя «выполнять» в течение момента — оно либо есть, либо нет.\nШаг 3. Такие глаголы в Continuous не употребляются.\nОтвет: правильно I know this rule. То же самое касается like, want, understand, remember.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.continuous.t1',
          topicId: 'english.continuous',
          skillId: 'english.present-continuous',
          difficulty: 1,
          kind: 'single',
          prompt: 'Выберите правильный вариант: Look! The children ___ in the yard.',
          options: ['play', 'plays', 'are playing', 'is playing'],
          correctIndex: 2,
          hint: 'Слово Look указывает на момент речи. Подлежащее во множественном числе.',
          explanation:
            'Look указывает на действие в момент речи, значит нужен Present Continuous.\nПодлежащее the children — множественное число, поэтому форма be — are.\nК глаголу добавляем -ing: playing.\nВарианты play и plays относятся к Present Simple, is playing не согласуется с множественным числом.\nОтвет: are playing.',
        },
        {
          id: 'english.continuous.t2',
          topicId: 'english.continuous',
          skillId: 'english.present-continuous',
          difficulty: 2,
          kind: 'single',
          prompt: 'В каком предложении есть ошибка?',
          options: [
            'She is watching TV now.',
            'I am knowing the answer.',
            'They are waiting for the bus.',
            'He is writing a letter.',
          ],
          correctIndex: 1,
          hint: 'Один из глаголов описывает состояние, а не действие.',
          explanation:
            'Глагол know описывает состояние, а не действие, поэтому в Present Continuous он не употребляется.\nПравильно: I know the answer.\nОстальные глаголы (watch, wait, write) обозначают действия и в Continuous стоят верно.\nОтвет: I am knowing the answer.',
        },
        {
          id: 'english.continuous.t3',
          topicId: 'english.continuous',
          skillId: 'english.present-continuous',
          difficulty: 2,
          kind: 'single',
          prompt: 'Выберите правильный вариант: I usually ___ tea, but today I ___ coffee.',
          options: [
            'am drinking / drink',
            'drink / am drinking',
            'drink / drink',
            'am drinking / am drinking',
          ],
          correctIndex: 1,
          hint: 'Usually говорит о привычке, today — об исключении в текущий момент.',
          explanation:
            'Слово usually указывает на регулярное действие, значит первая часть требует Present Simple: I drink tea.\nСлово today противопоставляет привычке то, что происходит именно сейчас, значит нужен Present Continuous: I am drinking coffee.\nЭто предложение специально построено так, чтобы показать разницу между временами.\nОтвет: drink / am drinking.',
        },
        {
          id: 'english.continuous.t4',
          topicId: 'english.continuous',
          skillId: 'english.present-continuous',
          difficulty: 3,
          kind: 'numeric',
          prompt:
            'Поставьте глагол в Present Continuous: He ___ (write) a letter now. Ответ дайте двумя словами.',
          correctValue: 'is writing',
          hint: 'Нужны две части: форма глагола be для he и смысловой глагол с окончанием -ing.',
          explanation:
            'Шаг 1. Подлежащее he, значит форма глагола be — is.\nШаг 2. К смысловому глаголу добавляем -ing. Основа write заканчивается на немую e, которая перед -ing отбрасывается: writing.\nШаг 3. Собираем: is writing.\nОтвет: is writing.',
        },
        {
          id: 'english.continuous.t5',
          topicId: 'english.continuous',
          skillId: 'english.present-continuous',
          difficulty: 4,
          kind: 'single',
          prompt: 'Как правильно построить вопрос в Present Continuous?',
          options: [
            'Does he reading a book?',
            'Is he reading a book?',
            'Do he is reading a book?',
            'He is reading a book?',
          ],
          correctIndex: 1,
          hint: 'В этом времени вспомогательным уже служит be. Нужен ли ещё и do?',
          explanation:
            'В Present Continuous роль вспомогательного глагола выполняет be, поэтому do или does не добавляют.\nВопрос строится перестановкой be на первое место: Is he reading a book?\nВарианты с does и do содержат сразу два вспомогательных глагола, что недопустимо.\nПоследний вариант сохраняет порядок утверждения.\nОтвет: Is he reading a book?',
        },
      ],
    },

    {
      id: 'english.past-simple',
      subjectId: 'english',
      title: 'Past Simple и неправильные глаголы',
      summary:
        'Как образуется прошедшее время, откуда берётся окончание -ed, зачем нужен did и что делать с неправильными глаголами.',
      grades: [7, 8, 9],
      difficulty: 2,
      skills: ['english.past-simple', 'english.irregular-verbs'],
      prerequisites: ['english.present-simple'],
      estimatedMinutes: 30,
      material: {
        intro:
          'Past Simple — время рассказа о прошлом. Любая история, любой пересказ прочитанного строится на нём. Главных трудностей две: неправильные глаголы, которые надо знать наизусть, и вспомогательный did, который ведёт себя так же, как does в настоящем, — забирает показатель времени себе.',
        sections: [
          {
            heading: 'Правильные глаголы',
            body:
              'К правильным глаголам в утверждении добавляется окончание -ed: work — worked, play — played. Если глагол заканчивается на немую e, добавляется только -d: live — lived. Если на согласную с -y, то y меняется на i: study — studied. Форма одинакова для всех лиц: I worked, he worked, they worked — здесь никаких -s не бывает.',
            formula: 'глагол + ed для всех лиц: I / he / we worked',
          },
          {
            heading: 'Неправильные глаголы',
            body:
              'Часть глаголов образует прошедшее время не по правилу, и их вторую форму приходится запоминать: go — went, see — saw, take — took, write — wrote, come — came, buy — bought, have — had, make — made. Это самые частотные глаголы языка, поэтому усилия окупаются быстро. Полезно учить их не списком, а в предложениях: так форма закрепляется вместе со смыслом.',
            formula: 'go — went, see — saw, take — took, write — wrote, buy — bought',
          },
          {
            heading: 'Отрицание и вопрос с did',
            body:
              'В отрицании и вопросе появляется вспомогательный глагол did — один и тот же для всех лиц и для всех глаголов, правильных и неправильных. И здесь работает то же правило, что в настоящем времени: did забирает показатель прошедшего времени себе, а смысловой глагол возвращается в начальную форму. He went, но He did not go и Did he go? Написать did he went — ошибка того же рода, что does she works.',
            formula: 'Did + подлежащее + глагол в начальной форме? He did not go. Did he go?',
          },
        ],
        keyPoints: [
          'В утверждении правильные глаголы получают -ed, неправильные — вторую форму.',
          'Форма прошедшего времени одинакова для всех лиц.',
          'В отрицании и вопросе появляется did для всех лиц без исключения.',
          'После did смысловой глагол стоит в начальной форме, без -ed и без второй формы.',
          'Слова-спутники: yesterday, last week, ago, in 2020.',
        ],
        examples: [
          {
            problem: 'Поставьте в отрицательную форму: She went to the cinema yesterday.',
            solution:
              'Шаг 1. Глагол went — вторая форма неправильного глагола go.\nШаг 2. Для отрицания берём did not.\nШаг 3. Показатель прошедшего времени переходит к did, поэтому смысловой глагол возвращается в начальную форму: go.\nОтвет: She did not go to the cinema yesterday. Вариант did not went содержит показатель прошедшего дважды и потому неверен.',
          },
          {
            problem: 'Постройте вопрос: They bought a new car last month.',
            solution:
              'Шаг 1. Ставим did на первое место — он одинаков для всех лиц.\nШаг 2. Затем подлежащее they.\nШаг 3. Смысловой глагол в начальной форме: bought становится buy.\nОтвет: Did they buy a new car last month?',
          },
        ],
      },
      tasks: [
        {
          id: 'english.past-simple.t1',
          topicId: 'english.past-simple',
          skillId: 'english.past-simple',
          difficulty: 1,
          kind: 'single',
          prompt: 'Выберите правильный вариант: Yesterday I ___ my homework.',
          options: ['do', 'did', 'does', 'doing'],
          correctIndex: 1,
          hint: 'Слово yesterday указывает на прошедшее время. Какая вторая форма у глагола do?',
          explanation:
            'Слово yesterday указывает на прошедшее время, значит нужен Past Simple.\nГлагол do неправильный, его вторая форма — did.\nЗдесь did выступает смысловым глаголом со значением «делал», а не вспомогательным.\nОтвет: did. Предложение целиком: Yesterday I did my homework.',
        },
        {
          id: 'english.past-simple.t2',
          topicId: 'english.past-simple',
          skillId: 'english.irregular-verbs',
          difficulty: 2,
          kind: 'numeric',
          prompt:
            'Напишите вторую форму (Past Simple) глагола go. Ответ дайте одним словом.',
          correctValue: 'went',
          hint: 'Это неправильный глагол, форма не похожа на начальную.',
          explanation:
            'Глагол go относится к неправильным, окончание -ed к нему не добавляется.\nЕго вторая форма — went.\nЗапоминать такие формы удобнее в предложении: I went to school yesterday.\nОтвет: went.',
        },
        {
          id: 'english.past-simple.t3',
          topicId: 'english.past-simple',
          skillId: 'english.past-simple',
          difficulty: 2,
          kind: 'single',
          prompt: 'Какое предложение построено правильно?',
          options: [
            'Did you went to the park?',
            'Did you go to the park?',
            'Do you went to the park?',
            'You did went to the park?',
          ],
          correctIndex: 1,
          hint: 'Вспомогательный глагол уже стоит в прошедшем времени. Нужно ли повторять показатель прошедшего у смыслового глагола?',
          explanation:
            'В вопросе Past Simple вспомогательный глагол did уже несёт значение прошедшего времени.\nПоэтому смысловой глагол ставится в начальную форму: go, а не went.\nВариант Do you went сочетает настоящее время вспомогательного с прошедшим смыслового.\nПоследний вариант нарушает порядок слов в вопросе.\nОтвет: Did you go to the park?',
        },
        {
          id: 'english.past-simple.t4',
          topicId: 'english.past-simple',
          skillId: 'english.past-simple',
          difficulty: 3,
          kind: 'numeric',
          prompt:
            'Поставьте глагол в Past Simple: She ___ (study) all evening yesterday. Ответ дайте одним словом.',
          correctValue: 'studied',
          hint: 'Глагол правильный, но перед окончанием меняется последняя буква основы.',
          explanation:
            'Глагол study правильный, значит нужно окончание -ed.\nОснова заканчивается на согласную d плюс y, поэтому y меняется на i.\nПолучается studied.\nОтвет: studied. Если бы перед y стояла гласная (play), окончание добавили бы без изменений: played.',
        },
        {
          id: 'english.past-simple.t5',
          topicId: 'english.past-simple',
          skillId: 'english.irregular-verbs',
          difficulty: 3,
          kind: 'single',
          prompt: 'В каком ряду все глаголы даны в правильной второй форме?',
          options: [
            'see — seed, take — taked, write — writed',
            'see — saw, take — took, write — wrote',
            'see — saw, take — taked, write — wrote',
            'see — seen, take — taken, write — written',
          ],
          correctIndex: 1,
          hint: 'Все три глагола неправильные. Последний вариант — это третья форма, а не вторая.',
          explanation:
            'See, take и write — неправильные глаголы, окончание -ed к ним не добавляется.\nИх вторые формы: saw, took, wrote.\nВариант с seen, taken, written содержит третьи формы (Past Participle), которые нужны для Present Perfect и пассивного залога, но не для Past Simple.\nОтвет: see — saw, take — took, write — wrote.',
        },
      ],
    },

    {
      id: 'english.present-perfect',
      subjectId: 'english',
      title: 'Present Perfect и его отличие от Past Simple',
      summary:
        'Как образуется Present Perfect, почему он относится к настоящему и по каким словам выбирают между ним и Past Simple.',
      grades: [8, 9, 10, 11],
      difficulty: 4,
      skills: ['english.present-perfect', 'english.irregular-verbs'],
      prerequisites: ['english.past-simple'],
      estimatedMinutes: 35,
      material: {
        intro:
          'Present Perfect — самая трудная тема школьного курса для говорящих по-русски, потому что в русском языке соответствующей формы просто нет. Обе английские формы переводятся прошедшим временем, и выбирать приходится не по переводу, а по смыслу: важен ли сам факт сейчас или важно, когда это произошло.',
        sections: [
          {
            heading: 'Образование',
            body:
              'Present Perfect строится из have или has и третьей формы глагола (Past Participle). Для he, she, it берётся has, для остальных лиц have. У правильных глаголов третья форма совпадает со второй и оканчивается на -ed, у неправильных её надо знать отдельно: go — went — gone, see — saw — seen, write — wrote — written.',
            formula: 'have / has + третья форма глагола: I have done, she has gone',
          },
          {
            heading: 'Смысл: результат важен сейчас',
            body:
              'Present Perfect связывает прошлое действие с настоящим моментом: важен результат, а не время события. I have lost my keys значит, что ключей нет прямо сейчас. Если же указано конкретное время в прошлом, связь с настоящим разрывается и нужен Past Simple: I lost my keys yesterday. Поэтому с Present Perfect несовместимы слова yesterday, last week, ago, in 2020.',
          },
          {
            heading: 'Слова-спутники',
            body:
              'На Present Perfect указывают already, just, yet, ever, never, recently, so far, а также since и for при разговоре о периоде, длящемся до сих пор. Since обозначает начальную точку (since 2020), for — длительность (for three years). На Past Simple указывают yesterday, last month, two days ago, when. Найти такое слово в предложении — самый надёжный способ выбрать время.',
            formula: 'Present Perfect: already, just, yet, ever, never, since, for. Past Simple: yesterday, ago, last week',
          },
        ],
        keyPoints: [
          'Present Perfect = have / has + третья форма глагола.',
          'Он говорит о результате, важном сейчас, а не о моменте в прошлом.',
          'С указанием конкретного времени в прошлом употребляется Past Simple.',
          'Слова already, just, yet, ever, never, since, for требуют Present Perfect.',
          'У неправильных глаголов вторая и третья формы различаются: went и gone.',
        ],
        examples: [
          {
            problem: 'Выберите верное время: I ___ (lose) my keys. I cannot open the door.',
            solution:
              'Шаг 1. Второе предложение показывает, что результат важен прямо сейчас: дверь не открыть.\nШаг 2. Конкретного времени в прошлом не указано.\nШаг 3. Значит нужен Present Perfect.\nШаг 4. Подлежащее I, значит have; третья форма глагола lose — lost.\nОтвет: I have lost my keys.',
          },
          {
            problem: 'Почему нельзя сказать I have seen this film yesterday?',
            solution:
              'Шаг 1. Слово yesterday указывает конкретный момент в прошлом.\nШаг 2. Present Perfect связывает действие с настоящим и не сочетается с конкретным прошедшим временем.\nШаг 3. Значит нужен Past Simple.\nОтвет: правильно I saw this film yesterday. Без yesterday корректным был бы вариант I have seen this film — «я смотрел этот фильм, знаю его».',
          },
        ],
      },
      tasks: [
        {
          id: 'english.present-perfect.t1',
          topicId: 'english.present-perfect',
          skillId: 'english.present-perfect',
          difficulty: 3,
          kind: 'single',
          prompt: 'Выберите правильный вариант: She ___ just finished her homework.',
          options: ['have', 'has', 'is', 'did'],
          correctIndex: 1,
          hint: 'Слово just указывает на Present Perfect. Какая форма вспомогательного глагола нужна для she?',
          explanation:
            'Слово just — характерный спутник Present Perfect.\nВремя образуется вспомогательным глаголом have, который для he, she, it принимает форму has.\nHave подошёл бы к I, you, we, they.\nIs используется в Continuous, did — в Past Simple.\nОтвет: has. Полностью: She has just finished her homework.',
        },
        {
          id: 'english.present-perfect.t2',
          topicId: 'english.present-perfect',
          skillId: 'english.present-perfect',
          difficulty: 4,
          kind: 'single',
          prompt: 'В каком предложении время выбрано верно?',
          options: [
            'I have seen this film yesterday.',
            'I saw this film yesterday.',
            'I have saw this film yesterday.',
            'I did seen this film yesterday.',
          ],
          correctIndex: 1,
          hint: 'Слово yesterday называет конкретный момент прошлого. Совместим ли он с Present Perfect?',
          explanation:
            'Yesterday указывает конкретное время в прошлом, а Present Perfect с такими указаниями не употребляется.\nЗначит нужен Past Simple и вторая форма глагола see — saw.\nВариант have saw содержит вторую форму вместо третьей, вариант did seen — третью вместо начальной.\nОтвет: I saw this film yesterday.',
        },
        {
          id: 'english.present-perfect.t3',
          topicId: 'english.present-perfect',
          skillId: 'english.irregular-verbs',
          difficulty: 4,
          kind: 'numeric',
          prompt:
            'Напишите третью форму (Past Participle) глагола write. Ответ дайте одним словом.',
          correctValue: 'written',
          hint: 'Вторая форма — wrote, а третья отличается от неё.',
          explanation:
            'Глагол write неправильный, его три формы: write — wrote — written.\nВторая форма wrote нужна для Past Simple, третья written — для Present Perfect и пассивного залога.\nОтвет: written. Например: I have written a letter.',
        },
        {
          id: 'english.present-perfect.t4',
          topicId: 'english.present-perfect',
          skillId: 'english.present-perfect',
          difficulty: 4,
          kind: 'single',
          prompt: 'Какое слово НЕ употребляется с Present Perfect?',
          options: ['already', 'just', 'yesterday', 'never'],
          correctIndex: 2,
          hint: 'Ищите слово, которое называет конкретный момент прошлого.',
          explanation:
            'Already, just и never связывают действие с настоящим и характерны для Present Perfect.\nYesterday указывает конкретный момент в прошлом и требует Past Simple, потому что связь с настоящим при этом разрывается.\nОтвет: yesterday.',
        },
        {
          id: 'english.present-perfect.t5',
          topicId: 'english.present-perfect',
          skillId: 'english.present-perfect',
          difficulty: 5,
          kind: 'single',
          prompt:
            'Выберите верный вариант: I ___ in Astana since 2019 and I still live here.',
          options: ['lived', 'have lived', 'was living', 'live'],
          correctIndex: 1,
          hint: 'Действие началось в прошлом и продолжается сейчас. Обратите внимание на слово since.',
          explanation:
            'Слово since обозначает начальную точку периода, который длится до настоящего момента.\nВторая часть предложения прямо подтверждает: I still live here.\nДействие, начавшееся в прошлом и продолжающееся сейчас, передаётся Present Perfect.\nLived означало бы, что период закончился, live не передаёт длительности от 2019 года.\nОтвет: have lived.',
        },
      ],
    },

    {
      id: 'english.future',
      subjectId: 'english',
      title: 'Будущее время: will и be going to',
      summary:
        'Чем решение в момент речи отличается от заранее принятого плана и почему в придаточных времени будущее не ставится.',
      grades: [8, 9, 10],
      difficulty: 3,
      skills: ['english.future-forms'],
      prerequisites: ['english.present-simple'],
      estimatedMinutes: 25,
      material: {
        intro:
          'В английском нет одного будущего времени — есть несколько способов говорить о будущем, и выбор между ними передаёт оттенок смысла, которого в русском переводе не видно. Разница между I will help you и I am going to help you заметна носителю сразу, и школьная программа требует её различать.',
        sections: [
          {
            heading: 'Will: решение в момент речи и предсказание',
            body:
              'Will употребляют, когда решение принимается прямо сейчас, в момент разговора: The phone is ringing. I will answer it. Второе значение — предсказание, основанное на мнении: I think it will rain tomorrow. Третье — обещание и предложение помощи. Форма одинакова для всех лиц, отрицание — will not или won’t.',
            formula: 'will + глагол в начальной форме, для всех лиц одинаково',
          },
          {
            heading: 'Be going to: план и очевидное следствие',
            body:
              'Be going to употребляют, когда решение принято заранее: We are going to buy a house next year — значит решение уже есть, возможно и деньги отложены. Второе значение — предсказание, основанное на том, что видно прямо сейчас: Look at those clouds! It is going to rain. Разница с will здесь именно в основании: will опирается на мнение, going to — на видимый признак.',
            formula: 'am / is / are going to + глагол в начальной форме',
          },
          {
            heading: 'Будущее в придаточных времени и условия',
            body:
              'После союзов when, if, before, after, until, as soon as будущее время не употребляется — вместо него ставится настоящее, хотя речь идёт о будущем. I will call you when I arrive, а не when I will arrive. Правило распространяется только на придаточную часть; в главной will остаётся на месте. Это одно из тех правил, которые нарушают чаще всего, потому что русский перевод подсказывает будущее в обеих частях.',
            formula: 'I will call you when I arrive (не when I will arrive)',
          },
        ],
        keyPoints: [
          'Will — решение в момент речи, обещание, предсказание по мнению.',
          'Be going to — заранее принятый план или предсказание по видимому признаку.',
          'После will и going to глагол стоит в начальной форме.',
          'После when, if, as soon as будущее время не ставится — только настоящее.',
          'Правило про придаточные касается только придаточной части, не главной.',
        ],
        examples: [
          {
            problem:
              'Выберите форму: The bags are heavy. — Do not worry, I ___ help you.',
            solution:
              'Шаг 1. Смотрим на ситуацию: говорящий узнал о проблеме только что.\nШаг 2. Значит решение помочь принимается прямо в момент речи.\nШаг 3. Такое решение передаётся через will.\nОтвет: I will help you. Вариант I am going to help you означал бы, что помощь была запланирована заранее, а это противоречит ситуации.',
          },
          {
            problem: 'Исправьте ошибку: I will call you when I will arrive.',
            solution:
              'Шаг 1. Находим придаточное предложение времени: оно вводится союзом when.\nШаг 2. После when будущее время не употребляется, даже если речь о будущем.\nШаг 3. Заменяем will arrive на настоящее время arrive.\nШаг 4. В главной части will остаётся без изменений.\nОтвет: I will call you when I arrive.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.future.t1',
          topicId: 'english.future',
          skillId: 'english.future-forms',
          difficulty: 2,
          kind: 'single',
          prompt:
            'Выберите верный вариант: Look at those clouds! It ___ rain.',
          options: ['will', 'is going to', 'goes to', 'is'],
          correctIndex: 1,
          hint: 'Предсказание основано на том, что видно прямо сейчас, а не на мнении.',
          explanation:
            'Фраза Look at those clouds указывает на видимый признак приближающегося дождя.\nПредсказание, основанное на очевидном признаке, передаётся конструкцией be going to.\nWill использовался бы для мнения: I think it will rain tomorrow.\nОтвет: is going to.',
        },
        {
          id: 'english.future.t2',
          topicId: 'english.future',
          skillId: 'english.future-forms',
          difficulty: 2,
          kind: 'single',
          prompt: 'Какая форма глагола следует за will?',
          options: [
            'Начальная форма без to',
            'Форма с окончанием -ing',
            'Вторая форма',
            'Форма с to',
          ],
          correctIndex: 0,
          hint: 'Will относится к модальным глаголам, а после них частица to не ставится.',
          explanation:
            'Will — модальный глагол, и после него смысловой глагол стоит в начальной форме без частицы to: I will go, she will come.\nФорма с -ing нужна для Continuous, вторая форма — для Past Simple.\nВариант will to go грамматически неверен.\nОтвет: начальная форма без to.',
        },
        {
          id: 'english.future.t3',
          topicId: 'english.future',
          skillId: 'english.future-forms',
          difficulty: 3,
          kind: 'single',
          prompt: 'В каком предложении есть ошибка?',
          options: [
            'I will call you when I arrive.',
            'I will call you when I will arrive.',
            'We are going to travel next summer.',
            'She will be twelve next year.',
          ],
          correctIndex: 1,
          hint: 'Проверьте, что стоит после союза when.',
          explanation:
            'После союзов времени (when, before, after, as soon as, until) будущее время не употребляется — вместо него ставится настоящее.\nПоэтому when I will arrive неверно, правильно when I arrive.\nВ главной части will сохраняется, и первый вариант построен верно.\nОтвет: I will call you when I will arrive.',
        },
        {
          id: 'english.future.t4',
          topicId: 'english.future',
          skillId: 'english.future-forms',
          difficulty: 3,
          kind: 'single',
          prompt:
            'Выберите верный вариант: We have already bought the tickets. We ___ visit Almaty in July.',
          options: ['will', 'are going to', 'go to', 'went to'],
          correctIndex: 1,
          hint: 'Билеты уже куплены — значит решение принято заранее.',
          explanation:
            'Первое предложение показывает, что решение принято заранее и уже подкреплено действиями: билеты куплены.\nЗаранее принятый план передаётся конструкцией be going to.\nWill означал бы решение, возникшее прямо сейчас, что противоречит контексту.\nОтвет: are going to.',
        },
        {
          id: 'english.future.t5',
          topicId: 'english.future',
          skillId: 'english.future-forms',
          difficulty: 4,
          kind: 'single',
          prompt:
            'В чём разница между I will help you и I am going to help you?',
          options: [
            'Разницы нет, это синонимы',
            'Первое — решение в момент речи, второе — план, принятый заранее',
            'Первое относится к прошлому, второе к будущему',
            'Первое употребляется только в вопросах',
          ],
          correctIndex: 1,
          hint: 'Подумайте, когда именно было принято решение помочь.',
          explanation:
            'I will help you означает, что решение помочь принимается прямо сейчас, в ответ на услышанное.\nI am going to help you означает, что помощь была запланирована заранее.\nОба предложения относятся к будущему и переводятся на русский почти одинаково, но для носителя языка разница очевидна.\nОтвет: первое — решение в момент речи, второе — план, принятый заранее.',
        },
      ],
    },

    {
      id: 'english.articles',
      subjectId: 'english',
      title: 'Артикли a, an и the',
      summary:
        'Когда ставится неопределённый артикль, когда определённый и в каких случаях артикль не нужен вовсе.',
      grades: [7, 8, 9],
      difficulty: 2,
      skills: ['english.articles'],
      prerequisites: [],
      estimatedMinutes: 25,
      material: {
        intro:
          'Артиклей в русском языке нет, поэтому их приходится не переводить, а понимать через функцию. Артикль отвечает на вопрос, знает ли собеседник, о каком именно предмете идёт речь. Ошибки в артиклях не мешают понять смысл, но сразу выдают неносителя, и на экзамене их считают за грамматическую ошибку.',
        sections: [
          {
            heading: 'Неопределённый артикль a и an',
            body:
              'Артикль a ставится перед исчисляемым существительным в единственном числе, когда предмет упоминается впервые или когда важен не конкретный предмет, а его вид: I saw a dog. Форма an используется перед гласным звуком: an apple, an hour. Обратите внимание, что выбор зависит от звука, а не от буквы: в слове hour первая буква согласная, но звук гласный, поэтому an; в слове university первая буква гласная, но звук согласный, поэтому a university.',
            formula: 'a перед согласным звуком, an перед гласным: a book, an apple, an hour, a university',
          },
          {
            heading: 'Определённый артикль the',
            body:
              'The ставится, когда собеседнику понятно, о каком именно предмете речь: предмет уже упоминался (I saw a dog. The dog was black), он единственный в своём роде (the sun, the moon), он определён контекстом (the door of this room) или назван с превосходной степенью и порядковым числительным (the best, the first). The не зависит от числа и употребляется и с единственным, и с множественным.',
          },
          {
            heading: 'Когда артикль не нужен',
            body:
              'Артикль не ставится перед именами людей и большинством географических названий (Kazakhstan, Astana), перед названиями школьных предметов, языков, видов спорта, приёмов пищи и перед существительными во множественном числе в общем значении: I like books. Также без артикля употребляются неисчисляемые существительные в общем смысле: Water is important. Отдельно запоминают устойчивые сочетания: go to school, at home, by bus.',
            formula: 'Без артикля: имена, страны, языки, спорт, множественное число в общем значении',
          },
        ],
        keyPoints: [
          'A и an ставятся только перед исчисляемыми в единственном числе.',
          'Выбор между a и an зависит от звука, а не от буквы.',
          'The указывает, что собеседнику ясно, о каком предмете речь.',
          'При первом упоминании обычно a, при повторном — the.',
          'Перед именами, странами, языками и множественным числом в общем значении артикль не ставится.',
        ],
        examples: [
          {
            problem: 'Вставьте артикли: I have ___ cat. ___ cat is very old.',
            solution:
              'Шаг 1. В первом предложении кошка упоминается впервые, собеседник о ней ещё не знает.\nШаг 2. Существительное исчисляемое, в единственном числе, начинается с согласного звука — значит a.\nШаг 3. Во втором предложении речь идёт уже об известной кошке, о той самой.\nШаг 4. Значит нужен определённый артикль the.\nОтвет: I have a cat. The cat is very old.',
          },
          {
            problem: 'Почему пишут an hour, но a university?',
            solution:
              'Шаг 1. Правило опирается на звук, а не на букву.\nШаг 2. В слове hour буква h не читается, слово начинается с гласного звука — значит an.\nШаг 3. В слове university первый звук передаётся как согласный (похож на «ю»), значит a.\nОтвет: an hour и a university. Именно поэтому нельзя выбирать артикль просто по первой букве.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.articles.t1',
          topicId: 'english.articles',
          skillId: 'english.articles',
          difficulty: 1,
          kind: 'single',
          prompt: 'Выберите правильный артикль: I saw ___ elephant at the zoo.',
          options: ['a', 'an', 'the', 'без артикля'],
          correctIndex: 1,
          hint: 'Слово начинается с гласного звука, и упоминается впервые.',
          explanation:
            'Слон упоминается впервые, значит нужен неопределённый артикль.\nСлово elephant начинается с гласного звука, поэтому берётся форма an.\nThe означал бы, что собеседнику известно, о каком именно слоне речь.\nОтвет: an.',
        },
        {
          id: 'english.articles.t2',
          topicId: 'english.articles',
          skillId: 'english.articles',
          difficulty: 2,
          kind: 'single',
          prompt: 'Выберите правильный артикль: ___ sun rises in the east.',
          options: ['A', 'An', 'The', 'без артикля'],
          correctIndex: 2,
          hint: 'Солнце у нас одно. Что это значит для выбора артикля?',
          explanation:
            'Солнце — единственный в своём роде объект, поэтому употребляется определённый артикль the.\nНеопределённый артикль означал бы «какое-то одно солнце из многих», что бессмысленно.\nОтвет: The sun rises in the east.',
        },
        {
          id: 'english.articles.t3',
          topicId: 'english.articles',
          skillId: 'english.articles',
          difficulty: 2,
          kind: 'single',
          prompt: 'В каком варианте артикль употреблён верно?',
          options: [
            'I live in the Kazakhstan.',
            'I live in Kazakhstan.',
            'I live in a Kazakhstan.',
            'I live in an Kazakhstan.',
          ],
          correctIndex: 1,
          hint: 'Перед большинством названий стран артикль не ставится.',
          explanation:
            'Перед названиями большинства стран артикль не употребляется: Kazakhstan, France, Japan.\nИсключения составляют названия, включающие слова вроде kingdom или states (the United Kingdom, the USA), а также страны во множественном числе (the Netherlands).\nОтвет: I live in Kazakhstan.',
        },
        {
          id: 'english.articles.t4',
          topicId: 'english.articles',
          skillId: 'english.articles',
          difficulty: 3,
          kind: 'numeric',
          prompt:
            'Вставьте нужный артикль: She wants to become ___ engineer. Ответ дайте одним словом.',
          correctValue: 'an',
          hint: 'Профессия упоминается как одна из многих, а слово начинается с гласного звука.',
          explanation:
            'Перед названием профессии в единственном числе ставится неопределённый артикль: она хочет стать одним из инженеров, а не конкретным известным инженером.\nСлово engineer начинается с гласного звука, поэтому используется форма an.\nОтвет: an. Полностью: She wants to become an engineer.',
        },
        {
          id: 'english.articles.t5',
          topicId: 'english.articles',
          skillId: 'english.articles',
          difficulty: 4,
          kind: 'single',
          prompt: 'Почему говорят an hour, но a university?',
          options: [
            'Это исключения, которые надо запомнить без объяснения',
            'Выбор зависит от первого звука слова, а не от первой буквы',
            'An ставится перед короткими словами',
            'Это разные части речи',
          ],
          correctIndex: 1,
          hint: 'Прочитайте оба слова вслух и прислушайтесь к первому звуку.',
          explanation:
            'Правило опирается на произношение.\nВ слове hour буква h не читается, слово начинается с гласного звука, поэтому an.\nВ слове university первый звук согласный (похож на «ю»), поэтому a.\nЭто не исключения, а последовательное применение звукового правила.\nОтвет: выбор зависит от первого звука слова, а не от первой буквы.',
        },
      ],
    },

    {
      id: 'english.comparatives',
      subjectId: 'english',
      title: 'Степени сравнения прилагательных',
      summary:
        'Как образуются сравнительная и превосходная степени у коротких и длинных прилагательных и какие формы нужно запомнить.',
      grades: [7, 8, 9],
      difficulty: 2,
      skills: ['english.comparatives'],
      prerequisites: ['english.articles'],
      estimatedMinutes: 25,
      material: {
        intro:
          'Сравнение — одна из самых востребованных конструкций в речи: мы постоянно говорим, что что-то лучше, дешевле, интереснее. В английском способ образования зависит от длины прилагательного, и именно это правило чаще всего нарушают, говоря more big вместо bigger.',
        sections: [
          {
            heading: 'Короткие прилагательные',
            body:
              'К односложным прилагательным и двусложным на -y добавляют окончания: -er для сравнительной степени и -est для превосходной. Big — bigger — the biggest, easy — easier — the easiest. При этом действуют орфографические правила: конечная согласная после краткого гласного удваивается (big — bigger), конечная y меняется на i (easy — easier), немая e не дублируется (nice — nicer).',
            formula: 'short + er / the + short + est: cold — colder — the coldest',
          },
          {
            heading: 'Длинные прилагательные',
            body:
              'К прилагательным из двух и более слогов добавляют слова more и the most: interesting — more interesting — the most interesting; beautiful — more beautiful — the most beautiful. Смешивать два способа нельзя: more bigger — грубая ошибка, потому что степень сравнения выражена дважды. Перед превосходной степенью почти всегда стоит артикль the.',
            formula: 'more + long / the most + long: more difficult — the most difficult',
          },
          {
            heading: 'Особые формы',
            body:
              'Несколько самых частотных прилагательных образуют степени не по правилу, и их надо знать наизусть: good — better — the best; bad — worse — the worst; little — less — the least; many и much — more — the most; far — further — the furthest. При сравнении двух предметов используется союз than: This book is more interesting than that one.',
            formula: 'good — better — the best; bad — worse — the worst',
          },
        ],
        keyPoints: [
          'Короткие прилагательные: окончания -er и -est.',
          'Длинные прилагательные: слова more и the most.',
          'Два способа никогда не смешиваются: more bigger недопустимо.',
          'Перед превосходной степенью ставится артикль the.',
          'Особые формы: good — better — the best, bad — worse — the worst.',
        ],
        examples: [
          {
            problem: 'Образуйте степени сравнения от прилагательного big.',
            solution:
              'Шаг 1. Слово односложное, значит используем окончания, а не more.\nШаг 2. Основа заканчивается на согласную после краткого гласного, поэтому согласная удваивается.\nШаг 3. Сравнительная степень: bigger.\nШаг 4. Превосходная: the biggest.\nОтвет: big — bigger — the biggest.',
          },
          {
            problem: 'Найдите и исправьте ошибку: This task is more easier than that one.',
            solution:
              'Шаг 1. Прилагательное easy двусложное, но оканчивается на -y, значит относится к коротким.\nШаг 2. Для коротких используется окончание -er: easier.\nШаг 3. Слово more здесь лишнее — степень сравнения выражена дважды.\nОтвет: This task is easier than that one.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.comparatives.t1',
          topicId: 'english.comparatives',
          skillId: 'english.comparatives',
          difficulty: 1,
          kind: 'single',
          prompt: 'Выберите правильный вариант: This box is ___ than that one.',
          options: ['more heavy', 'heavier', 'heaviest', 'the heavier'],
          correctIndex: 1,
          hint: 'Прилагательное двусложное и оканчивается на -y, значит относится к коротким.',
          explanation:
            'Прилагательное heavy оканчивается на -y, поэтому образует степени сравнения по короткой модели, с окончанием -er.\nКонечная y при этом меняется на i: heavier.\nMore heavy смешивает два способа, heaviest — превосходная степень, а сравнивают только два предмета.\nОтвет: heavier.',
        },
        {
          id: 'english.comparatives.t2',
          topicId: 'english.comparatives',
          skillId: 'english.comparatives',
          difficulty: 2,
          kind: 'numeric',
          prompt:
            'Напишите сравнительную степень прилагательного good. Ответ дайте одним словом.',
          correctValue: 'better',
          hint: 'Это прилагательное образует степени не по правилу.',
          explanation:
            'Прилагательное good относится к особым: его степени образуются не по правилу.\nПолный ряд: good — better — the best.\nФорма gooder не существует.\nОтвет: better.',
        },
        {
          id: 'english.comparatives.t3',
          topicId: 'english.comparatives',
          skillId: 'english.comparatives',
          difficulty: 2,
          kind: 'single',
          prompt: 'Выберите правильный вариант: This is ___ film I have ever seen.',
          options: [
            'the most interesting',
            'more interesting',
            'the interestingest',
            'most interesting',
          ],
          correctIndex: 0,
          hint: 'Прилагательное длинное, и по смыслу нужна превосходная степень с артиклем.',
          explanation:
            'Фраза I have ever seen указывает на превосходную степень: самый интересный из всех.\nПрилагательное interesting длинное, значит используется the most.\nОкончание -est к длинным прилагательным не добавляется.\nАртикль the перед превосходной степенью обязателен.\nОтвет: the most interesting.',
        },
        {
          id: 'english.comparatives.t4',
          topicId: 'english.comparatives',
          skillId: 'english.comparatives',
          difficulty: 3,
          kind: 'single',
          prompt: 'В каком предложении есть ошибка?',
          options: [
            'My brother is taller than me.',
            'This book is more interesting than that one.',
            'Today is more colder than yesterday.',
            'She is the best student in the class.',
          ],
          correctIndex: 2,
          hint: 'Проверьте, не выражена ли степень сравнения дважды.',
          explanation:
            'Прилагательное cold односложное, значит образует сравнительную степень окончанием -er: colder.\nСлово more здесь лишнее — получается двойное выражение степени сравнения.\nПравильно: Today is colder than yesterday.\nОстальные предложения построены верно.\nОтвет: Today is more colder than yesterday.',
        },
        {
          id: 'english.comparatives.t5',
          topicId: 'english.comparatives',
          skillId: 'english.comparatives',
          difficulty: 3,
          kind: 'numeric',
          prompt:
            'Напишите превосходную степень прилагательного bad, без артикля. Ответ дайте одним словом.',
          correctValue: 'worst',
          hint: 'Это прилагательное тоже образует степени не по правилу.',
          explanation:
            'Прилагательное bad относится к особым.\nЕго ряд: bad — worse — the worst.\nФормы baddest не существует.\nОтвет: worst. В предложении обычно с артиклем: This is the worst day.',
        },
      ],
    },

    {
      id: 'english.modals',
      subjectId: 'english',
      title: 'Модальные глаголы',
      summary:
        'Can, must, should и have to: что каждый выражает, чем отличается must от have to и почему после них нет частицы to.',
      grades: [8, 9, 10],
      difficulty: 3,
      skills: ['english.modals'],
      prerequisites: ['english.present-simple'],
      estimatedMinutes: 30,
      material: {
        intro:
          'Модальные глаголы выражают не действие, а отношение к нему: возможность, необходимость, совет, запрет. Одно слово меняет смысл всего предложения, поэтому ошибка в выборе модального глагола искажает высказывание сильнее, чем ошибка во времени.',
        sections: [
          {
            heading: 'Общие свойства',
            body:
              'Модальные глаголы ведут себя не как обычные. После них смысловой глагол стоит в начальной форме без частицы to (кроме have to и ought to). Они не принимают окончание -s в третьем лице: she can, а не she cans. Вопрос и отрицание строятся без do: Can she swim? She cannot swim.',
            formula: 'can / must / should + глагол без to; she can, не she cans',
          },
          {
            heading: 'Значения основных глаголов',
            body:
              'Can выражает способность и разрешение: I can swim, Can I come in? Must — сильную необходимость, исходящую от говорящего, а также уверенное предположение: You must be tired. Should — совет и рекомендацию: You should see a doctor. May выражает разрешение и вероятность. В отрицании смыслы расходятся особенно сильно: must not — запрет, а do not have to — отсутствие необходимости.',
            formula: 'must not = нельзя; do not have to = не обязательно',
          },
          {
            heading: 'Must и have to',
            body:
              'Оба выражают необходимость, но её источник разный. Must обозначает необходимость, исходящую от самого говорящего: I must call my mother — я сам так решил. Have to обозначает необходимость, навязанную обстоятельствами или правилами: I have to wear a uniform at school — так требует школа. В прошедшем времени у must формы нет, и её заменяет had to.',
          },
        ],
        keyPoints: [
          'После модального глагола смысловой стоит без частицы to.',
          'Модальные глаголы не получают -s в третьем лице.',
          'Вопрос и отрицание строятся без do.',
          'Must — необходимость от говорящего, have to — от обстоятельств.',
          'Must not означает запрет, do not have to — отсутствие необходимости.',
        ],
        examples: [
          {
            problem: 'Найдите ошибку: She cans speak three languages.',
            solution:
              'Шаг 1. Can — модальный глагол.\nШаг 2. Модальные глаголы не принимают окончание -s в третьем лице единственного числа.\nШаг 3. Убираем окончание.\nОтвет: She can speak three languages.',
          },
          {
            problem:
              'В чём разница между You must not go there и You do not have to go there?',
            solution:
              'Шаг 1. Must not выражает запрет: туда нельзя идти.\nШаг 2. Do not have to выражает отсутствие необходимости: идти не обязательно, но можно.\nШаг 3. Смыслы фактически противоположны, хотя обе конструкции отрицательные.\nОтвет: первое — запрет, второе — свобода выбора. Путаница здесь приводит к прямому искажению смысла.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.modals.t1',
          topicId: 'english.modals',
          skillId: 'english.modals',
          difficulty: 2,
          kind: 'single',
          prompt: 'Выберите правильный вариант: She ___ swim very well.',
          options: ['cans', 'can', 'can to', 'is can'],
          correctIndex: 1,
          hint: 'Модальные глаголы не изменяются по лицам и не требуют частицы to.',
          explanation:
            'Can — модальный глагол, он не принимает окончание -s в третьем лице, поэтому cans неверно.\nПосле него смысловой глагол стоит без частицы to, поэтому can to swim тоже неверно.\nФорма is can грамматически невозможна.\nОтвет: can.',
        },
        {
          id: 'english.modals.t2',
          topicId: 'english.modals',
          skillId: 'english.modals',
          difficulty: 2,
          kind: 'single',
          prompt: 'Какой модальный глагол выражает совет?',
          options: ['can', 'must', 'should', 'may'],
          correctIndex: 2,
          hint: 'Нужен глагол для фразы «тебе стоило бы сходить к врачу».',
          explanation:
            'Should выражает совет и рекомендацию: You should see a doctor.\nCan обозначает способность или разрешение, must — сильную необходимость или запрет, may — разрешение или вероятность.\nОтвет: should.',
        },
        {
          id: 'english.modals.t3',
          topicId: 'english.modals',
          skillId: 'english.modals',
          difficulty: 3,
          kind: 'single',
          prompt: 'Что означает You must not smoke here?',
          options: [
            'Здесь можно не курить, если не хочется',
            'Здесь курить запрещено',
            'Здесь курят редко',
            'Здесь курить не обязательно',
          ],
          correctIndex: 1,
          hint: 'Must not — это не отсутствие необходимости, а нечто более строгое.',
          explanation:
            'Must not выражает строгий запрет: делать этого нельзя.\nОтсутствие необходимости передаётся другой конструкцией — do not have to.\nПутаница между ними меняет смысл на противоположный, поэтому различие проверяют особенно часто.\nОтвет: здесь курить запрещено.',
        },
        {
          id: 'english.modals.t4',
          topicId: 'english.modals',
          skillId: 'english.modals',
          difficulty: 4,
          kind: 'single',
          prompt:
            'Выберите верный вариант: At our school we ___ wear a uniform — such are the rules.',
          options: ['must not', 'have to', 'should not', 'can'],
          correctIndex: 1,
          hint: 'Необходимость исходит от правил школы, а не от самого говорящего.',
          explanation:
            'Have to выражает необходимость, навязанную внешними обстоятельствами или правилами, что прямо указано в предложении.\nMust передавал бы решение самого говорящего.\nMust not и should not означали бы запрет, что противоречит смыслу.\nCan выражает возможность, а не обязанность.\nОтвет: have to.',
        },
        {
          id: 'english.modals.t5',
          topicId: 'english.modals',
          skillId: 'english.modals',
          difficulty: 4,
          kind: 'single',
          prompt: 'Как правильно построить вопрос с модальным глаголом?',
          options: [
            'Do you can help me?',
            'Can you help me?',
            'Can you to help me?',
            'You can help me?',
          ],
          correctIndex: 1,
          hint: 'Модальный глагол сам выполняет роль вспомогательного.',
          explanation:
            'Модальный глагол сам является вспомогательным, поэтому do в вопросе не нужен.\nВопрос строится перестановкой модального глагола на первое место, а смысловой глагол стоит без частицы to.\nПоследний вариант сохраняет порядок утверждения.\nОтвет: Can you help me?',
        },
      ],
    },

    {
      id: 'english.conditionals',
      subjectId: 'english',
      title: 'Условные предложения',
      summary:
        'Три основных типа условных предложений: закономерность, реальное условие в будущем и нереальное условие в настоящем.',
      grades: [9, 10, 11],
      difficulty: 4,
      skills: ['english.conditionals'],
      prerequisites: ['english.future', 'english.past-simple'],
      estimatedMinutes: 35,
      material: {
        intro:
          'Условные предложения показывают, что произойдёт при определённом условии. Тип выбирается по тому, насколько условие реально: закономерность, вероятное будущее или заведомо невозможная ситуация. Формулы строгие, и именно поэтому тема хорошо поддаётся освоению: достаточно запомнить три схемы.',
        sections: [
          {
            heading: 'Нулевой тип: закономерность',
            body:
              'Нулевой тип описывает то, что происходит всегда при данном условии: научные факты, законы природы, привычки. В обеих частях употребляется Present Simple. If you heat water to 100 degrees, it boils. Здесь if можно заменить на when без потери смысла — это признак нулевого типа.',
            formula: 'If + Present Simple, Present Simple',
          },
          {
            heading: 'Первый тип: реальное условие в будущем',
            body:
              'Первый тип описывает вероятную ситуацию в будущем: условие вполне может исполниться. В придаточной части ставится Present Simple, в главной — will. If it rains tomorrow, we will stay at home. Ключевая ошибка — поставить will в обе части: после if будущее время не употребляется, как и после союзов времени.',
            formula: 'If + Present Simple, will + глагол',
          },
          {
            heading: 'Второй тип: нереальное условие в настоящем',
            body:
              'Второй тип описывает воображаемую или маловероятную ситуацию: если бы да кабы. В придаточной части ставится Past Simple, в главной — would. If I had a million, I would travel around the world. Особенность: с глаголом be во всех лицах употребляется форма were, а не was: If I were you, I would accept the offer. Это устойчивая формула совета.',
            formula: 'If + Past Simple, would + глагол; If I were you, I would...',
          },
        ],
        keyPoints: [
          'Нулевой тип: Present Simple в обеих частях, для закономерностей.',
          'Первый тип: if + Present Simple, would заменяется на will.',
          'Второй тип: if + Past Simple, в главной части would.',
          'После if будущее время не употребляется никогда.',
          'Во втором типе с be употребляется were во всех лицах.',
        ],
        examples: [
          {
            problem: 'Определите тип и заполните: If it ___ (rain) tomorrow, we ___ (stay) at home.',
            solution:
              'Шаг 1. Речь о завтрашнем дне, условие вполне реально — значит первый тип.\nШаг 2. В придаточной части после if ставим Present Simple: rains.\nШаг 3. В главной части ставим will: will stay.\nОтвет: If it rains tomorrow, we will stay at home. Форма if it will rain была бы ошибкой.',
          },
          {
            problem: 'Заполните: If I ___ (be) you, I ___ (accept) this offer.',
            solution:
              'Шаг 1. Говорящий не может быть собеседником, условие заведомо нереально — значит второй тип.\nШаг 2. В придаточной части ставится Past Simple, но глагол be принимает форму were независимо от лица.\nШаг 3. В главной части ставится would.\nОтвет: If I were you, I would accept this offer. Это устойчивая формула вежливого совета.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.conditionals.t1',
          topicId: 'english.conditionals',
          skillId: 'english.conditionals',
          difficulty: 3,
          kind: 'single',
          prompt: 'Выберите верный вариант: If you heat ice, it ___.',
          options: ['will melt', 'melts', 'would melt', 'melted'],
          correctIndex: 1,
          hint: 'Это происходит всегда, а не при каком-то конкретном случае в будущем.',
          explanation:
            'Предложение описывает закономерность природы: лёд тает при нагревании всегда.\nЭто нулевой тип условных предложений, в обеих частях употребляется Present Simple.\nПроверка: if можно заменить на when без изменения смысла — верный признак нулевого типа.\nОтвет: melts.',
        },
        {
          id: 'english.conditionals.t2',
          topicId: 'english.conditionals',
          skillId: 'english.conditionals',
          difficulty: 4,
          kind: 'single',
          prompt: 'Выберите верный вариант: If it ___ tomorrow, we will stay at home.',
          options: ['will rain', 'rains', 'rained', 'would rain'],
          correctIndex: 1,
          hint: 'После союза if будущее время не употребляется.',
          explanation:
            'Это первый тип условного предложения: условие реально и относится к будущему.\nВ придаточной части после if ставится Present Simple, несмотря на будущее значение.\nБудущее время выражено в главной части словом will.\nВариант if it will rain — самая частая ошибка в теме.\nОтвет: rains.',
        },
        {
          id: 'english.conditionals.t3',
          topicId: 'english.conditionals',
          skillId: 'english.conditionals',
          difficulty: 4,
          kind: 'single',
          prompt:
            'Выберите верный вариант: If I ___ a million dollars, I would travel around the world.',
          options: ['have', 'will have', 'had', 'would have'],
          correctIndex: 2,
          hint: 'В главной части стоит would — значит условие нереально. Какое время нужно после if?',
          explanation:
            'Наличие would в главной части указывает на второй тип: ситуация воображаемая.\nВ придаточной части второго типа употребляется Past Simple: had.\nЭто не означает прошедшего времени по смыслу — форма прошедшего используется для выражения нереальности.\nОтвет: had.',
        },
        {
          id: 'english.conditionals.t4',
          topicId: 'english.conditionals',
          skillId: 'english.conditionals',
          difficulty: 5,
          kind: 'numeric',
          prompt:
            'Вставьте нужную форму глагола be: If I ___ you, I would apologize. Ответ дайте одним словом.',
          correctValue: 'were',
          hint: 'Во втором типе условных предложений глагол be имеет одну форму для всех лиц.',
          explanation:
            'Это второй тип условного предложения: говорящий не может быть собеседником.\nВ придаточной части второго типа глагол be принимает форму were для всех лиц, включая I и he.\nФорма was в этой конструкции считается разговорной и на экзамене не засчитывается.\nОтвет: were. Полностью: If I were you, I would apologize.',
        },
        {
          id: 'english.conditionals.t5',
          topicId: 'english.conditionals',
          skillId: 'english.conditionals',
          difficulty: 5,
          kind: 'single',
          prompt: 'В каком предложении допущена ошибка?',
          options: [
            'If it rains, we will stay at home.',
            'If it will rain, we will stay at home.',
            'If I had time, I would help you.',
            'If you heat water, it boils.',
          ],
          correctIndex: 1,
          hint: 'Проверьте, что стоит непосредственно после союза if.',
          explanation:
            'После союза if будущее время не употребляется ни в одном из типов условных предложений.\nПоэтому if it will rain неверно — нужно if it rains.\nОстальные предложения построены правильно: первое относится к первому типу, третье ко второму, четвёртое к нулевому.\nОтвет: If it will rain, we will stay at home.',
        },
      ],
    },

    {
      id: 'english.passive',
      subjectId: 'english',
      title: 'Пассивный залог',
      summary:
        'Как превратить активное предложение в пассивное, зачем нужен пассив и как он образуется в разных временах.',
      grades: [9, 10, 11],
      difficulty: 4,
      skills: ['english.passive', 'english.irregular-verbs'],
      prerequisites: ['english.present-perfect'],
      estimatedMinutes: 35,
      material: {
        intro:
          'Пассивный залог нужен, когда важно само действие, а не тот, кто его совершил. Научные тексты, новости, инструкции построены на нём: The experiment was carried out, The building was constructed in 1990. Для школьника это ещё и обязательная тема на экзамене, где проверяют умение перестроить предложение.',
        sections: [
          {
            heading: 'Образование',
            body:
              'Пассив образуется из глагола be в нужном времени и третьей формы смыслового глагола. Время показывает именно be, а третья форма остаётся неизменной: The letter is written (настоящее), was written (прошедшее), will be written (будущее), has been written (Present Perfect). Отсюда следует практическое правило: чтобы поставить пассив в нужное время, надо изменить только be.',
            formula: 'be (в нужном времени) + третья форма: is written, was written, will be written',
          },
          {
            heading: 'Как перестроить предложение',
            body:
              'Дополнение активного предложения становится подлежащим пассивного, глагол переходит в пассивную форму того же времени, а прежнее подлежащее либо убирается, либо присоединяется предлогом by. Shakespeare wrote Hamlet превращается в Hamlet was written by Shakespeare. Указывать деятеля через by нужно только тогда, когда это существенно; в большинстве случаев его опускают.',
            formula: 'Активный: A + глагол + B. Пассивный: B + be + третья форма + by A',
          },
          {
            heading: 'Когда употребляется',
            body:
              'Пассив выбирают, если деятель неизвестен (My bike was stolen), неважен (The bridge was built in 1980), очевиден из контекста или если хотят подчеркнуть само действие. В научном стиле пассив помогает сохранить объективность: описывается процесс, а не личность исследователя. Именно поэтому лабораторные отчёты и инструкции им насыщены.',
          },
        ],
        keyPoints: [
          'Пассив = be в нужном времени + третья форма глагола.',
          'Время выражает только глагол be, третья форма не меняется.',
          'Дополнение активного предложения становится подлежащим пассивного.',
          'Деятель присоединяется предлогом by и часто опускается.',
          'Пассив уместен, когда деятель неизвестен, неважен или очевиден.',
        ],
        examples: [
          {
            problem: 'Перестройте в пассив: Shakespeare wrote Hamlet.',
            solution:
              'Шаг 1. Находим дополнение: Hamlet. Оно становится подлежащим.\nШаг 2. Определяем время активного предложения: Past Simple.\nШаг 3. Значит be ставим в прошедшее время единственного числа: was.\nШаг 4. Берём третью форму глагола write: written.\nШаг 5. Деятеля присоединяем предлогом by.\nОтвет: Hamlet was written by Shakespeare.',
          },
          {
            problem: 'Почему в новостях пишут The road was closed, а не They closed the road?',
            solution:
              'Шаг 1. В новости важен факт: дорога закрыта.\nШаг 2. Кто именно принял решение, читателю чаще всего неизвестно и не существенно.\nШаг 3. Пассив позволяет не называть деятеля вовсе.\nОтвет: пассив ставит в центр само событие, а не исполнителя, и потому характерен для новостей и официальных сообщений.',
          },
        ],
      },
      tasks: [
        {
          id: 'english.passive.t1',
          topicId: 'english.passive',
          skillId: 'english.passive',
          difficulty: 3,
          kind: 'single',
          prompt: 'Выберите правильную пассивную форму: The letter ___ yesterday.',
          options: ['is sent', 'was sent', 'sent', 'has sent'],
          correctIndex: 1,
          hint: 'Слово yesterday указывает на прошедшее время. Какую форму примет глагол be?',
          explanation:
            'Yesterday указывает на Past Simple, значит глагол be ставится в форму прошедшего времени: was.\nТретья форма глагола send — sent.\nВариант is sent относится к настоящему времени, has sent — активная форма Present Perfect.\nОтвет: was sent.',
        },
        {
          id: 'english.passive.t2',
          topicId: 'english.passive',
          skillId: 'english.passive',
          difficulty: 4,
          kind: 'single',
          prompt: 'Как правильно перестроить в пассив предложение They built this house in 1990?',
          options: [
            'This house built in 1990.',
            'This house was built in 1990.',
            'This house is built in 1990.',
            'This house has built in 1990.',
          ],
          correctIndex: 1,
          hint: 'Дополнение становится подлежащим, время сохраняется прошедшим.',
          explanation:
            'Дополнение this house становится подлежащим пассивного предложения.\nВремя активного предложения — Past Simple, значит be принимает форму was.\nТретья форма глагола build — built.\nУказание деятеля they здесь несущественно и опускается.\nОтвет: This house was built in 1990.',
        },
        {
          id: 'english.passive.t3',
          topicId: 'english.passive',
          skillId: 'english.passive',
          difficulty: 4,
          kind: 'single',
          prompt: 'Какая форма глагола используется в пассивном залоге?',
          options: ['Первая (начальная)', 'Вторая (Past Simple)', 'Третья (Past Participle)', 'Форма с -ing'],
          correctIndex: 2,
          hint: 'Та же форма, что и в Present Perfect после have.',
          explanation:
            'Пассивный залог строится из глагола be и третьей формы смыслового глагола (Past Participle).\nЭто та же форма, что употребляется в Present Perfect после have: written, done, built.\nВторая форма нужна для активного Past Simple, форма с -ing — для Continuous.\nОтвет: третья (Past Participle).',
        },
        {
          id: 'english.passive.t4',
          topicId: 'english.passive',
          skillId: 'english.passive',
          difficulty: 5,
          kind: 'numeric',
          prompt:
            'Дополните пассивную форму настоящего времени: English ___ spoken in many countries. Ответ дайте одним словом.',
          correctValue: 'is',
          hint: 'Подлежащее в единственном числе, время настоящее. Какая форма глагола be нужна?',
          explanation:
            'Пассив образуется глаголом be плюс третья форма spoken.\nПодлежащее English — единственное число, время настоящее, значит форма be — is.\nОтвет: is. Полностью: English is spoken in many countries.',
        },
        {
          id: 'english.passive.t5',
          topicId: 'english.passive',
          skillId: 'english.passive',
          difficulty: 5,
          kind: 'single',
          prompt: 'В каком случае уместнее употребить пассивный залог?',
          options: [
            'Когда важно подчеркнуть, кто именно совершил действие',
            'Когда деятель неизвестен или неважен',
            'Когда предложение стоит в вопросительной форме',
            'Когда в предложении есть модальный глагол',
          ],
          correctIndex: 1,
          hint: 'Подумайте, зачем в новости пишут «дорога была закрыта», не называя, кем именно.',
          explanation:
            'Пассив ставит в центр внимания само действие или его объект, а деятеля позволяет не называть.\nПоэтому он уместен, когда деятель неизвестен (My bike was stolen), неважен или очевиден.\nЕсли же нужно подчеркнуть исполнителя, естественнее активный залог.\nВопросительная форма и модальные глаголы с выбором залога не связаны.\nОтвет: когда деятель неизвестен или неважен.',
        },
      ],
    },
  ],

  /* ---------------------------------------------------------------- */
  /*  Диагностика                                                      */
  /* ---------------------------------------------------------------- */

  diagnostic: [
    {
      id: 'english.diag.q1',
      topicId: 'english.present-simple',
      skillId: 'english.present-simple',
      difficulty: 1,
      kind: 'single',
      prompt: 'She ___ to school every day.',
      options: ['go', 'goes', 'going', 'gone'],
      correctIndex: 1,
      hint: 'Подлежащее — третье лицо единственного числа.',
      explanation:
        'В Present Simple при подлежащем he, she, it глагол получает окончание.\nОснова go заканчивается на -o, поэтому добавляется -es: goes.\nОтвет: goes.',
    },
    {
      id: 'english.diag.q2',
      topicId: 'english.present-simple',
      skillId: 'english.word-order',
      difficulty: 2,
      kind: 'single',
      prompt: 'Выберите правильно построенный вопрос.',
      options: [
        'Does he works here?',
        'Does he work here?',
        'Do he work here?',
        'He does work here?',
      ],
      correctIndex: 1,
      hint: 'Окончание -s уже перешло к вспомогательному глаголу.',
      explanation:
        'В вопросе Present Simple вспомогательный глагол does несёт показатель третьего лица, поэтому смысловой глагол стоит в начальной форме.\nОтвет: Does he work here?',
    },
    {
      id: 'english.diag.q3',
      topicId: 'english.continuous',
      skillId: 'english.present-continuous',
      difficulty: 2,
      kind: 'single',
      prompt: 'Look! The baby ___ .',
      options: ['sleep', 'sleeps', 'is sleeping', 'slept'],
      correctIndex: 2,
      hint: 'Слово Look указывает на момент речи.',
      explanation:
        'Действие происходит в момент речи, значит нужен Present Continuous.\nПодлежащее в единственном числе, поэтому is, и глагол с окончанием -ing.\nОтвет: is sleeping.',
    },
    {
      id: 'english.diag.q4',
      topicId: 'english.past-simple',
      skillId: 'english.irregular-verbs',
      difficulty: 2,
      kind: 'numeric',
      prompt: 'Напишите вторую форму глагола see. Ответ дайте одним словом.',
      correctValue: 'saw',
      hint: 'Глагол неправильный, окончание -ed не добавляется.',
      explanation:
        'Глагол see неправильный, его формы: see — saw — seen.\nВторая форма нужна для Past Simple.\nОтвет: saw.',
    },
    {
      id: 'english.diag.q5',
      topicId: 'english.past-simple',
      skillId: 'english.past-simple',
      difficulty: 3,
      kind: 'single',
      prompt: 'Выберите правильный вариант.',
      options: [
        'Did you went there?',
        'Did you go there?',
        'Do you went there?',
        'You did go there?',
      ],
      correctIndex: 1,
      hint: 'Вспомогательный глагол did уже стоит в прошедшем времени.',
      explanation:
        'После did смысловой глагол ставится в начальную форму, потому что показатель прошедшего времени уже выражен вспомогательным глаголом.\nОтвет: Did you go there?',
    },
    {
      id: 'english.diag.q6',
      topicId: 'english.present-perfect',
      skillId: 'english.present-perfect',
      difficulty: 4,
      kind: 'single',
      prompt: 'She ___ just finished her work.',
      options: ['have', 'has', 'is', 'did'],
      correctIndex: 1,
      hint: 'Слово just — спутник Present Perfect.',
      explanation:
        'Present Perfect образуется глаголом have, который для третьего лица единственного числа принимает форму has.\nОтвет: has.',
    },
    {
      id: 'english.diag.q7',
      topicId: 'english.present-perfect',
      skillId: 'english.present-perfect',
      difficulty: 4,
      kind: 'single',
      prompt: 'Какое слово НЕ употребляется с Present Perfect?',
      options: ['already', 'never', 'yesterday', 'just'],
      correctIndex: 2,
      hint: 'Ищите указание на конкретный момент в прошлом.',
      explanation:
        'Yesterday называет конкретный момент прошлого и разрывает связь с настоящим, поэтому требует Past Simple.\nОстальные слова характерны для Present Perfect.\nОтвет: yesterday.',
    },
    {
      id: 'english.diag.q8',
      topicId: 'english.future',
      skillId: 'english.future-forms',
      difficulty: 3,
      kind: 'single',
      prompt: 'Выберите верный вариант: I will call you when I ___ home.',
      options: ['will get', 'get', 'got', 'am getting'],
      correctIndex: 1,
      hint: 'После союза when будущее время не употребляется.',
      explanation:
        'В придаточных предложениях времени после when, before, after, as soon as будущее время заменяется настоящим.\nОтвет: get.',
    },
    {
      id: 'english.diag.q9',
      topicId: 'english.articles',
      skillId: 'english.articles',
      difficulty: 2,
      kind: 'single',
      prompt: 'Выберите правильный артикль: I saw ___ interesting film yesterday.',
      options: ['a', 'an', 'the', 'без артикля'],
      correctIndex: 1,
      hint: 'Обратите внимание на первый звук следующего слова.',
      explanation:
        'Фильм упоминается впервые, значит нужен неопределённый артикль.\nСледующее слово interesting начинается с гласного звука, поэтому используется форма an.\nОтвет: an.',
    },
    {
      id: 'english.diag.q10',
      topicId: 'english.articles',
      skillId: 'english.articles',
      difficulty: 3,
      kind: 'single',
      prompt: 'В каком варианте артикль употреблён верно?',
      options: [
        'The Astana is the capital of Kazakhstan.',
        'Astana is the capital of Kazakhstan.',
        'Astana is capital of Kazakhstan.',
        'An Astana is a capital of Kazakhstan.',
      ],
      correctIndex: 1,
      hint: 'Перед названиями городов артикль не ставится, но слово capital определено контекстом.',
      explanation:
        'Перед названиями городов и большинства стран артикль не употребляется.\nПри этом слово capital требует определённого артикля: столица у страны одна, она определена контекстом.\nОтвет: Astana is the capital of Kazakhstan.',
    },
    {
      id: 'english.diag.q11',
      topicId: 'english.comparatives',
      skillId: 'english.comparatives',
      difficulty: 3,
      kind: 'numeric',
      prompt:
        'Напишите сравнительную степень прилагательного good. Ответ дайте одним словом.',
      correctValue: 'better',
      hint: 'Это прилагательное образует степени не по правилу.',
      explanation:
        'Ряд особых форм: good — better — the best.\nФормы gooder не существует.\nОтвет: better.',
    },
    {
      id: 'english.diag.q12',
      topicId: 'english.modals',
      skillId: 'english.modals',
      difficulty: 3,
      kind: 'single',
      prompt: 'Выберите правильный вариант: She ___ speak three languages.',
      options: ['cans', 'can', 'can to', 'is can'],
      correctIndex: 1,
      hint: 'Модальные глаголы не изменяются по лицам.',
      explanation:
        'Модальные глаголы не принимают окончание -s и не требуют частицы to после себя.\nОтвет: can.',
    },
    {
      id: 'english.diag.q13',
      topicId: 'english.conditionals',
      skillId: 'english.conditionals',
      difficulty: 4,
      kind: 'single',
      prompt: 'Выберите верный вариант: If it ___ tomorrow, we will stay at home.',
      options: ['will rain', 'rains', 'rained', 'would rain'],
      correctIndex: 1,
      hint: 'После союза if будущее время не ставится.',
      explanation:
        'Это первый тип условного предложения: в придаточной части употребляется Present Simple, в главной — will.\nОтвет: rains.',
    },
    {
      id: 'english.diag.q14',
      topicId: 'english.passive',
      skillId: 'english.passive',
      difficulty: 4,
      kind: 'single',
      prompt: 'Выберите правильную пассивную форму: The house ___ in 1990.',
      options: ['built', 'was built', 'is built', 'has built'],
      correctIndex: 1,
      hint: 'Указан конкретный год в прошлом, значит время прошедшее.',
      explanation:
        'Пассив образуется глаголом be в нужном времени и третьей формой смыслового глагола.\nУказание 1990 требует прошедшего времени, значит was, и третья форма built.\nОтвет: was built.',
    },
  ],
};
