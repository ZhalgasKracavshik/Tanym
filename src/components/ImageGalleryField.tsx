'use client';

/**
 * Выбор нескольких изображений для карточки события.
 *
 * Одна картинка на карточке — заставка. Организатор обычно присылает
 * несколько: афишу, фото с прошлого года, схему площадки, — и именно их
 * листают, решая, идти или нет.
 *
 * Порядок важен и потому виден: первое изображение становится обложкой в
 * ленте, поэтому его можно двигать, а не только удалять. Без этого
 * единственным способом поменять обложку было бы удалить и загрузить всё
 * заново в нужном порядке.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { COVER_TYPES, coverError } from './ImageField';

/**
 * Больше пяти не нужно: карточку листают на ходу, а не изучают как
 * фотоальбом. Ограничение заодно бережёт и трафик, и место в бакете.
 */
export const MAX_IMAGES = 5;

export function ImageGalleryField({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ссылки выводятся из файлов, а не хранятся состоянием: они полностью
  // ими определяются, и лишнее состояние дало бы только второй рендер.
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function add(picked: FileList | null) {
    if (!picked || picked.length === 0) return;

    const incoming = Array.from(picked);
    const room = MAX_IMAGES - files.length;
    if (room <= 0) {
      setError(`Больше ${MAX_IMAGES} изображений не нужно.`);
      return;
    }

    // Первый негодный файл останавливает всю пачку: сказать «одно из
    // выбранных не подошло» и молча взять остальные — значит оставить
    // человека гадать, какое именно и куда оно делось.
    for (const file of incoming) {
      const problem = coverError(file);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setError(incoming.length > room ? `Добавлены первые ${room} — это предел.` : null);
    onChange([...files, ...incoming.slice(0, room)]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= files.length) return;
    const next = [...files];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink-800">Изображения</span>
        <span className="text-xs text-ink-400">
          {files.length} из {MAX_IMAGES}
        </span>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="overflow-hidden rounded-[var(--radius-control)] border border-ink-200"
            >
              <div className="relative aspect-[16/9] bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob-ссылка на локальный файл */}
                <img src={previews[index]} alt="" className="h-full w-full object-cover" />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-[var(--radius-pill)] bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ink-800">
                    обложка
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 bg-white px-2 py-1.5">
                <div className="flex gap-1">
                  <IconButton
                    label="Левее"
                    icon="chevron-left"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  />
                  <IconButton
                    label="Правее"
                    icon="chevron-right"
                    disabled={index === files.length - 1}
                    onClick={() => move(index, index + 1)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                  className="text-xs font-semibold text-ink-400 underline-offset-2 hover:text-danger-600 hover:underline"
                >
                  Убрать
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {files.length < MAX_IMAGES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 flex w-full flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-ink-300 bg-ink-50/60 px-4 py-7 text-center transition-colors duration-150 hover:border-brand-400 hover:bg-brand-50/50 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-500 shadow-[var(--shadow-rest)]">
            <Icon name="image" size={20} />
          </span>
          <span className="text-sm font-semibold text-ink-700">
            {files.length === 0 ? 'Добавить изображения' : 'Добавить ещё'}
          </span>
          <span className="text-xs text-ink-400">JPG, PNG или WebP, до 4 МБ каждое</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={COVER_TYPES.join(',')}
        className="sr-only"
        onChange={(event) => {
          add(event.target.files);
          event.target.value = '';
        }}
      />

      {error ? (
        <p className="mt-2 text-xs font-medium text-danger-600">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-ink-400">
          Необязательно. Первое изображение станет обложкой в афише.
        </p>
      )}
    </div>
  );
}

function IconButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: 'chevron-left' | 'chevron-right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-ink-500 transition-colors duration-150 hover:bg-ink-100 hover:text-ink-800 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
