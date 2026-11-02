# Запуск Taným: ключи, настройки, поиск

Всё ниже бесплатно, кроме пунктов с пометкой 💳. Порядок важен: сначала Supabase, потом Vercel, потом Google.

## 1. Supabase (дашборд проекта `tanym`)

**Authentication → Sign In / Providers → Email**
- **Minimum password length** = `8`. В приложении то же число (`src/lib/security/password.ts`), иначе сервер пропустит то, что не пропускает форма.
- **Password requirements** = «Letters and digits».
- **Confirm email** — включать вместе со своей почтой отправки (раздел 3). Встроенная почта Supabase — для тестов: она шлёт всего несколько писем в час, и при открытой регистрации ученики будут ждать письмо подтверждения часами. Порядок такой: домен → Resend → SMTP в Supabase → Confirm email.

**Authentication → Attack Protection → Prevent use of leaked passwords** — 💳 только на тарифе Pro ($25/мес), на Free переключатель не активен. Замена уже работает в коде: форма регистрации, сброса и смены пароля спрашивает ту же базу HaveIBeenPwned. Пароль не уходит, отправляются только первые 5 символов его хеша. Включать Pro ради этого не нужно.

**Authentication → URL Configuration**
- **Site URL**: `https://tanym-alpha.vercel.app` (или свой домен).
- **Redirect URLs**: добавить `https://tanym-alpha.vercel.app/auth/callback` и `https://*-zhalgastyrs-projects.vercel.app/**` (превью-деплои).

## 2. Vercel → Project `tanym` → Settings → Environment Variables

Каждую переменную добавить для **Production** (и Preview, если нужно проверять превью). После добавления: **Deployments → последний деплой → ⋯ → Redeploy**. Переменные подхватываются только новым деплоем.

| Переменная | Где взять | Обязательно |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL | да (скорее всего уже есть) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → publishable / anon | да (скорее всего уже есть) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → secret / service_role. **Никому не показывать**, не ставить префикс `NEXT_PUBLIC_` | да, для писем |
| `NEXT_PUBLIC_SITE_URL` | `https://tanym-alpha.vercel.app` или свой домен, без `/` в конце | да |
| `AI_LIVE` | `false` | да |
| `CRON_SECRET` | любая длинная случайная строка, например из менеджера паролей (40+ символов). Vercel сам пришлёт её кронам | да, для писем |
| `RESEND_API_KEY` | resend.com → API Keys → Create (бесплатно: 3000 писем в месяц) | для писем |
| `RESEND_FROM` | `Taným <noreply@ваш-домен>`. Работает только с подтверждённым в Resend доменом | для писем |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → `/newbot` → токен | по желанию |
| `TELEGRAM_CHANNEL_ID` | `@имя_канала`. Бота добавить в администраторы канала | по желанию |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Vercel → Storage / Marketplace → Upstash Redis (бесплатный план) — переменные пропишутся сами | по желанию (общий лимит запросов) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console, раздел 4 | для поиска |

**Кроны** (`vercel.json`) работают только на production-деплое, то есть после слияния PR в `main`. На бесплатном плане Hobby кроны разрешены раз в день: ежедневные напоминания и дайджест по понедельникам в это укладываются. Время может плавать в пределах часа.

**Пока нет домена:** без `RESEND_API_KEY` кроны работают вхолостую и только считают, кому ушло бы письмо. Resend без своего домена шлёт только на почту владельца аккаунта, ученикам письма не дойдут.

## 3. Свой домен — первая покупка, когда придут пользователи 💳

Домен нужен сразу для трёх вещей: письма (Resend + SMTP для подтверждения почты), доверие к ссылке в чатах и поиск.
- **Варианты:** `tanym.app`, `tanym.org`, `tanym.kz` — около $10–20 в год. Для `.kz` уточните у регистратора (ps.kz, hoster.kz) правило о размещении сервера в Казахстане: Vercel — зарубежный хостинг.
- **Подключение:** Vercel → Settings → Domains → Add → прописать DNS-записи, которые покажет Vercel.
- **Resend:** Domains → Add → DNS-записи (SPF/DKIM) → `RESEND_FROM=Taným <noreply@домен>`.
- **Supabase:** Authentication → Emails → SMTP Settings. Host `smtp.resend.com`, порт `465`, user `resend`, password = `RESEND_API_KEY`. После этого включить Confirm email.
- **Переменные:** поменять `NEXT_PUBLIC_SITE_URL` и Site URL в Supabase.

## 4. Google: чтобы по «Taným», «Tanym» и «Таным» находился сайт

Что уже сделано в коде:
- `sitemap.xml` с событиями афиши, `robots.txt`;
- заголовок и описание у каждого события;
- разметка schema.org (WebSite с написаниями «Таным/Tanym/Taným», Event у событий);
- картинка-превью `og.png`, иконки, manifest.

Что сделать вам:
1. **search.google.com/search-console** → Add property → **URL prefix** → адрес сайта.
2. Способ подтверждения **HTML tag**: скопировать значение `content="…"` в `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, сделать Redeploy, нажать Verify.
3. **Sitemaps** → добавить `sitemap.xml`.
4. **URL Inspection** → главная и `/events` → Request indexing.
5. Ссылки на сайт из своих каналов: Telegram-канал, Instagram (ссылка в профиле), сайт школы, чаты классов. Для Google это сигнал, что «Taným» — это вы.

**Про название.** «Таным» — обычное казахское слово («познание»), и с таким именем уже есть организации (Tanym School, ТОО TANYM SOCIAL). По одному слову «таным» сайт поднимется не сразу. По запросам «таным афиша», «tanym олимпиады», «Taným» он выйдет первым быстро, как только Google проиндексирует сайт (обычно 1–4 недели после шагов выше). Менять название не нужно: держите везде одно написание «Taným» и одну фразу рядом — «афиша олимпиад».
