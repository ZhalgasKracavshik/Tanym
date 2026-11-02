'use client';

/**
 * Последний рубеж: упал сам корневой layout (например, не загрузился
 * профиль). Провайдеров и стилей приложения тут нет, поэтому разметка
 * самодостаточная, со встроенными стилями и без перевода.
 */

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error]', error.digest ?? '', error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf9f7',
          color: '#1d1b19',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>Сайт временно недоступен</h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: '#6b655e', margin: '0 0 24px' }}>
            Мы уже видим ошибку. Попробуйте обновить страницу через минуту.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#1d1b19',
              color: '#fff',
              border: 0,
              borderRadius: 999,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}
