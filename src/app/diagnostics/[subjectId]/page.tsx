/**
 * Обёртка для страницы диагностики.
 *
 * Зачем два файла вместо одного: адрес страницы содержит переменную часть
 * (/diagnostics/math), и Next.js отдаёт её через params. В Next.js 16 params —
 * это промис, а значит компонент должен быть async. Но клиентский компонент
 * async быть не может — там useState и обработчики кликов.
 *
 * Поэтому здесь серверный компонент разворачивает промис и передаёт готовую
 * строку внутрь клиентского компонента обычным пропсом.
 */

import { DiagnosticsClient } from './DiagnosticsClient';

export default async function DiagnosticsPage({ params }: PageProps<'/diagnostics/[subjectId]'>) {
  const { subjectId } = await params;
  return <DiagnosticsClient subjectId={subjectId} />;
}
