# База данных Tanym (Supabase)

Проект Supabase: `tanym` (`beouaegvpexdprrbtkyw`).

## Где лежит схема

63 миграции до пилота применены в Supabase напрямую и в репозиторий не выгружались.
Их полные тексты хранятся в самой базе:

```sql
select version, name, array_to_string(statements, E';\n')
from supabase_migrations.schema_migrations
order by version;
```

Первая — `20260820093042_init_schema`, последняя до пилота — `20260904220106_achievement_organizer_and_proof_url`.

Новые миграции с пилота лежат в `db/migrations/`, имя файла — `<версия>_<имя>.sql`.
Каждая идемпотентна (`drop ... if exists` перед `create`), её можно применить повторно.

## Миграции пилота

Их нужно применить **до** деплоя кода из ветки пилота: код читает новые колонки и таблицы.

| Файл | Что делает |
| --- | --- |
| `20261006100000_pilot_open_student_registration.sql` | Ученик регистрируется с любой почтой. Учитель — только со школьного домена. `class_id` при создании профиля обязан быть пустым. Самостоятельная регистрация центров выключена. |
| `20261006100100_pilot_storage_hardening.sql` | Бакет сканов грамот становится приватным. Загрузка во все бакеты разрешена только в папку `<uid>/`. |
| `20261006100200_pilot_views_and_functions.sql` | Вьюхи работают с правами читающего, рейтинг идёт через `leaderboard_progress()`. У `anon` отозваны лишние права. |
| `20261006100300_pilot_event_moderation_and_saves.sql` | `published_events.status` (модерация событий учителей), CHECK-ограничения, таблица `event_saves` («Мои события»). |

Как применить (любой способ):

- **SQL Editor** в дашборде Supabase: вставить файлы по порядку и выполнить.
- **Supabase CLI**: `supabase db push` (если проект подключён через `supabase link`).
- **MCP** `apply_migration`: по одному файлу, имя миграции — часть имени файла после версии.

После применения проверьте **Advisors → Security** в дашборде.
Ошибки `security_definer_view` должны исчезнуть.

## Настройки, которые меняются только в дашборде

- **Authentication → Providers → Email → Confirm email** — включено. Без подтверждения почты открытая регистрация пускает ботов.
- **Authentication → Attack Protection → Leaked password protection** — включить (проверка пароля по HaveIBeenPwned).
- **Authentication → Rate Limits** — проверить лимиты на вход, регистрацию и письма. Вход идёт из браузера напрямую в Supabase, мимо сервера приложения, поэтому это единственный лимит на перебор паролей.
