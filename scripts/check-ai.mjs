/** Проверка подключения к Google Gemini  Запуск через  node scripts/check-ai.mjs, скрипт читает GEMINI_API_KEY из .env.local и делает один реальный запрос.
 * оно нужно чтоб отделить проблемы с ключом от проблем в коде приложения ,если здесь всё зелёное, значит ключ, сеть и модель в порядке.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvLocal() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8');
    const env = {};
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) env[match[1]] = match[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...readEnvLocal(), ...process.env };
const apiKey = env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('✗ GEMINI_API_KEY не найден. Скопируйте .env.example в .env.local и вставьте ключ.');
  process.exit(1);
}

const models = [env.GEMINI_MODEL, 'gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.5-flash'].filter(Boolean);

const prompt = `Ученик 9 класса решает квадратное уравнение x² - 5x + 6 = 0 и отвечает "x = 1 и x = 6".
Правильный ответ: x = 2 и x = 3. Объясни ошибку в двух предложениях по-русски.`;

for (const model of models) {
  process.stdout.write(`→ ${model}: `);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'Ты — наставник для школьников. Отвечай только по-русски.' }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
        }),
      },
    );

    if (!response.ok) {
      console.log(`HTTP ${response.status}\n  ${(await response.text()).slice(0, 300)}`);
      continue;
    }

    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .filter((part) => part.thought !== true && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
      .trim();

    if (!text) {
      console.log(`пустой ответ (finishReason=${data.candidates?.[0]?.finishReason ?? '?'})`);
      continue;
    }

    console.log('OK');
    console.log(`\n${text}\n`);
    console.log(`✓ Рабочая модель: ${model}`);
    process.exit(0);
  } catch (error) {
    console.log(`ошибка — ${error.message}`);
  }
}

console.error('✗ Ни одна модель не ответила.');
process.exit(1);
