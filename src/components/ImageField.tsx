'use client';

/**
 * Выбор обложки для карточки.
 *
 * Показывает то, что выбрали, сразу же. Поле `<input type="file">` без
 * предпросмотра сообщает только имя файла — а публикующий проверяет
 * глазами не имя, а кадрирование: влезло ли название на баннер, не обрезан
 * ли логотип. Поэтому здесь настоящая картинка в той же пропорции, в какой
 * она встанет на карточку.
 *
 * Формат и размер проверяются до загрузки. Дать выбрать 12-мегабайтный
 * снимок с телефона, отправить его и показать ошибку через минуту — худший
 * из возможных вариантов: время потрачено, а форма к тому же очищена.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';

/** Больше — это уже не обложка, а фотоархив: 4 МБ хватает с запасом. */
export const MAX_COVER_BYTES = 4 * 1024 * 1024;

/*
  Список конкретный, а не 'image/*'. За 'image/*' прячутся, например, svg
  (это документ со скриптами, а не картинка) и heic, который не покажет ни
  один браузер, кроме сафари.
*/
export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export function coverError(file: File): string | null {
  if (!COVER_TYPES.includes(file.type as (typeof COVER_TYPES)[number])) {
    return 'Подойдёт JPG, PNG или WebP.';
  }
  if (file.size > MAX_COVER_BYTES) {
    return `Файл больше ${Math.round(MAX_COVER_BYTES / 1024 / 1024)} МБ. Уменьшите картинку и попробуйте снова.`;
  }
  return null;
}

export function ImageField({
  file,
  onChange,
  label = 'Обложка',
  hint = 'Необязательно. Карточка без картинки покажет цветную плашку.',
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  hint?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /*
    Ссылка выводится из файла, а не хранится состоянием: она полностью им
    определяется, и лишнее состояние тут дало бы только второй рендер на
    каждую смену картинки.
  */
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  /*
    createObjectURL держит файл в памяти, пока ссылку не отозвали. Без
    revoke каждая примерка новой картинки оставляла бы за собой прошлую —
    на странице, где обложку меняют несколько раз подряд, это заметно.
  */
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function pick(next: File | null) {
    if (!next) {
      setError(null);
      onChange(null);
      return;
    }
    const problem = coverError(next);
    if (problem) {
      setError(problem);
      onChange(null);
      return;
    }
    setError(null);
    onChange(next);
  }

  return (
    <div>
      <span className="text-sm font-semibold text-ink-800">{label}</span>

      {preview ? (
        <div className="mt-2 overflow-hidden rounded-[var(--radius-control)] border border-ink-200">
          {/* Пропорция та же, что у баннера карточки, — что видно здесь,
              то и встанет в ленту, без сюрприза после публикации. */}
          <div className="relative aspect-[16/7] bg-ink-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob-ссылка на
                локальный файл, оптимизировать next/image здесь нечего. */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="flex items-center justify-between gap-3 bg-white px-3 py-2">
            <span className="min-w-0 truncate text-xs text-ink-500">{file?.name}</span>
            <button
              type="button"
              onClick={() => {
                pick(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="shrink-0 text-xs font-semibold text-ink-400 underline-offset-2 hover:text-danger-600 hover:underline"
            >
              Убрать
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-ink-300 bg-ink-50/60 px-4 py-8 text-center transition-colors duration-150 hover:border-brand-400 hover:bg-brand-50/50 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-500 shadow-[var(--shadow-rest)]">
            <Icon name="image" size={20} />
          </span>
          <span className="text-sm font-semibold text-ink-700">Выбрать изображение</span>
          <span className="text-xs text-ink-400">JPG, PNG или WebP, до 4 МБ</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={COVER_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {error ? (
        <p className="mt-2 text-xs font-medium text-danger-600">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-ink-400">{hint}</p>
      )}
    </div>
  );
}
