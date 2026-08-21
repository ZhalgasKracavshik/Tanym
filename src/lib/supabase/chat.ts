'use client';

/**
 * История диалога с наставником в Supabase.
 *
 * Раньше переписка жила только в localStorage: терялась при смене
 * браузера и не была видна с телефона, хотя вопросы ученик задаёт
 * с любого устройства одни и те же.
 *
 * Схема работы намеренно простая: локальное состояние остаётся живым
 * представлением (экран рисуется из него мгновенно, без ожидания сети),
 * а база — долговременным хранилищем. При открытии страницы история
 * подтягивается из базы, каждое новое сообщение уходит туда фоном.
 * Если запись не удалась, разговор не прерывается — на экране сообщение
 * всё равно есть, потеряется только его копия на сервере.
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from './client';
import type { ChatMessage } from '@/lib/types';

interface Row {
  role: 'user' | 'assistant';
  content: string;
  live: boolean;
  created_at: string;
}

/**
 * Загружает историю один раз при появлении ученика.
 *
 * Возвращает `null`, пока грузит, чтобы страница не мигнула пустым
 * экраном «начните диалог» у того, у кого переписка на самом деле есть.
 */
export function useChatHistory(studentId: string | null): {
  history: ChatMessage[] | null;
  saveMessage: (message: ChatMessage) => void;
  clearHistory: () => Promise<void>;
} {
  const [history, setHistory] = useState<ChatMessage[] | null>(null);

  useEffect(() => {
    if (!studentId) {
      setHistory([]);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    supabase
      .from('chat_messages')
      .select('role, content, live, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
      // Ограничение по объёму: в контекст модели уходят последние
      // несколько реплик, а на экране больше двух сотен всё равно
      // никто не прокручивает.
      .limit(200)
      .then(({ data }) => {
        if (cancelled) return;
        setHistory(
          ((data as Row[] | null) ?? []).map((row) => ({
            role: row.role,
            content: row.content,
            at: row.created_at,
            live: row.live,
          })),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const saveMessage = useCallback(
    (message: ChatMessage) => {
      if (!studentId) return;
      createClient()
        .from('chat_messages')
        .insert({
          student_id: studentId,
          role: message.role,
          content: message.content,
          live: message.live ?? true,
        })
        .then(() => undefined);
    },
    [studentId],
  );

  const clearHistory = useCallback(async () => {
    if (!studentId) return;
    await createClient().from('chat_messages').delete().eq('student_id', studentId);
    setHistory([]);
  }, [studentId]);

  return { history, saveMessage, clearHistory };
}
