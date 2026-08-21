'use client';

/**
 * Ссылки на соцсети в профиле.
 *
 * Два режима в одном компоненте: чужой профиль показывает готовые
 * кнопки, свой — те же кнопки плюс «плюсик» для добавления и крестик
 * на каждой. Отдельный «режим редактирования» здесь был бы лишним
 * шагом: ссылок единицы, и правят их редко и по одной.
 */

import { useState } from 'react';
import {
  SOCIAL_PLATFORMS,
  normalizeSocialUrl,
  platformMeta,
  shortenUrl,
  type SocialLink,
  type SocialPlatform,
} from '@/lib/social';
import { Icon } from './Icon';
import { PressButton, motion } from './motion';

/** Кнопка-ссылка на соцсеть. */
function LinkChip({ link, onRemove }: { link: SocialLink; onRemove?: () => void }) {
  const meta = platformMeta(link.platform);

  return (
    <motion.span layout className="group relative inline-flex">
      <a
        href={link.url}
        target="_blank"
        /*
          noopener обязателен: без него открытая вкладка получает доступ
          к window.opener и может подменить нашу страницу. Ссылки здесь
          ведут куда угодно, поэтому доверять им нельзя.
        */
        rel="noopener noreferrer nofollow"
        title={shortenUrl(link.url)}
        className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-ink-200 bg-white py-2 pl-2.5 pr-4 text-sm font-semibold text-ink-700 shadow-[var(--shadow-rest)] transition-all duration-150 hover:border-ink-300 hover:shadow-[var(--shadow-lift)]"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: meta.color }}
        >
          <Icon name={meta.icon} size={15} />
        </span>
        {meta.title}
      </a>

      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Удалить ссылку ${meta.title}`}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-400 opacity-0 shadow-[var(--shadow-rest)] transition-opacity duration-150 hover:text-danger-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Icon name="close" size={11} />
        </button>
      )}
    </motion.span>
  );
}

export function SocialLinks({
  links,
  editable = false,
  onChange,
}: {
  links: SocialLink[];
  editable?: boolean;
  onChange?: (links: SocialLink[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function add() {
    const safe = normalizeSocialUrl(url);
    if (!safe) {
      setError('Проверьте адрес — нужна ссылка вида https://instagram.com/username');
      return;
    }

    // Одна ссылка на площадку: вторая на ту же сеть ничего не добавляет,
    // а в ряду выглядит как ошибка.
    const next = [...links.filter((item) => item.platform !== platform), { platform, url: safe }];
    onChange?.(next);
    setUrl('');
    setError(null);
    setAdding(false);
  }

  function remove(target: SocialPlatform) {
    onChange?.(links.filter((item) => item.platform !== target));
  }

  if (!editable && links.length === 0) return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <LinkChip
            key={link.platform}
            link={link}
            onRemove={editable ? () => remove(link.platform) : undefined}
          />
        ))}

        {editable && !adding && (
          <PressButton
            onClick={() => setAdding(true)}
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-pill)] border border-dashed border-ink-300 px-4 text-sm font-semibold text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-600"
          >
            <Icon name="plus" size={16} />
            Добавить ссылку
          </PressButton>
        )}
      </div>

      {editable && adding && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 shadow-[var(--shadow-rest)]"
        >
          <div className="flex flex-wrap gap-2">
            {SOCIAL_PLATFORMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setPlatform(item.id)}
                aria-pressed={platform === item.id}
                className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                  platform === item.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-ink-200 text-ink-600 hover:border-brand-300'
                }`}
              >
                <Icon name={item.icon} size={14} />
                {item.title}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add();
                }
              }}
              placeholder={platformMeta(platform).placeholder}
              className="h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-ink-200 px-4 text-sm outline-none transition-all placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
            <PressButton
              onClick={add}
              className="h-11 rounded-[var(--radius-control)] px-5 text-sm font-bold text-white shadow-[var(--shadow-glow)]"
              style={{ background: 'var(--gradient-brand)' }}
            >
              Добавить
            </PressButton>
            <PressButton
              onClick={() => {
                setAdding(false);
                setError(null);
                setUrl('');
              }}
              className="h-11 rounded-[var(--radius-control)] border border-ink-200 px-4 text-sm font-semibold text-ink-600"
            >
              Отмена
            </PressButton>
          </div>

          {error && <p className="mt-2 text-sm font-semibold text-danger-600">{error}</p>}
        </motion.div>
      )}
    </div>
  );
}
