import { NextResponse } from 'next/server';

/**
 * Приёмник отчётов о нарушениях CSP (report-uri в политике из proxy.ts).
 * Перенесено из Ulagat.
 *
 * Пишет одну компактную строку в лог сервера — нарушения видны в runtime
 * логах Vercel. Без авторизации намеренно (браузер шлёт отчёт без куки) и
 * с ограничением размера, чтобы им нельзя было забить логи.
 */
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 8_192) {
      return new NextResponse(null, { status: 413 });
    }
    const body = JSON.parse(text);
    // Старый формат {"csp-report": {...}} и формат Reporting API.
    const report = body['csp-report'] ?? body;
    console.warn(
      '[csp-report]',
      JSON.stringify({
        documentUri: report['document-uri'] ?? report.documentURL,
        violatedDirective: report['violated-directive'] ?? report.effectiveDirective,
        blockedUri: report['blocked-uri'] ?? report.blockedURL,
        sourceFile: report['source-file'] ?? report.sourceFile,
        lineNumber: report['line-number'] ?? report.lineNumber,
      })
    );
  } catch {
    // Испорченный отчёт — делать нечего.
  }
  return new NextResponse(null, { status: 204 });
}
