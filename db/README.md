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
| `20261006100400_pilot_event_saves_policies.sql` | Доводка предыдущей миграции: в SQL Editor не применился её хвост, у `event_saves` не было политик и прав. |
| `20261006100500_pilot_public_events.sql` | Гость читает одобренные события (афиша без входа). |
| `20261006100600_pilot_teacher_requests_and_event_proposals.sql` | Заявка «Я учитель» (`request_teacher_role`), её видно в `admin_list_users`. Предложить событие на проверку может любой вошедший. |
| `20261013100000_pilot_event_sources_applications_reminders.sql` | У события поля «источник» (`source_url`) и «сверено» (`verified_at`, ставит только админ). У `event_saves` статус: сохранил → подал заявку → участвовал. Журнал напоминаний `deadline_reminders`. |

Как применить (любой способ):

- **SQL Editor** в дашборде Supabase: вставить файлы по порядку и выполнить. Каждый файл вставляйте целиком и проверьте, что SQL Editor не обрезал хвост.
- **Supabase CLI**: `supabase db push` (если проект подключён через `supabase link`).
- **MCP** `apply_migration`: по одному файлу, имя миграции — часть имени файла после версии.

После применения проверьте **Advisors → Security** в дашборде.
Ошибки `security_definer_view` должны исчезнуть.

## Настройки, которые меняются только в дашборде

- **Authentication → Providers → Email → Confirm email** — **включить**. Проверено 2026-10-06: сейчас выключено (`mailer_autoconfirm: true`). Без подтверждения почты открытая регистрация пускает ботов и чужие адреса.
- **Authentication → Attack Protection → Leaked password protection** — включить (проверка пароля по HaveIBeenPwned).
- **Authentication → Rate Limits** — проверить лимиты на вход, регистрацию и письма. Вход идёт из браузера напрямую в Supabase, мимо сервера приложения, поэтому это единственный лимит на перебор паролей.
