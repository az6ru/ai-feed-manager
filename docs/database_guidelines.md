# Рекомендации по работе с базой данных

## Схема базы данных

База данных AI Feed Manager состоит из следующих основных таблиц:

### profiles
Таблица пользователей приложения.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Первичный ключ, совпадает с id в auth.users |
| email | text | Email пользователя |
| display_name | text | Отображаемое имя пользователя |
| created_at | timestamp | Дата и время создания |
| updated_at | timestamp | Дата и время последнего обновления |

### feeds
Таблица фидов товаров.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Первичный ключ |
| user_id | uuid | Внешний ключ на profiles.id |
| name | text | Название фида |
| source | text | Источник фида (url или тип) |
| metadata | jsonb | Метаданные фида в формате JSON |
| is_published | boolean | Флаг публикации фида |
| published_url | text | URL опубликованного фида |
| products_count | integer | Количество товаров в фиде |
| categories_count | integer | Количество категорий в фиде |
| created_at | timestamp | Дата и время создания |
| updated_at | timestamp | Дата и время последнего обновления |
| date_created | timestamp | Дата создания фида |
| date_modified | timestamp | Дата последнего изменения фида |
| version | text | Версия фида |

### categories
Таблица категорий товаров.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Первичный ключ |
| feed_id | uuid | Внешний ключ на feeds.id |
| name | text | Название категории |
| parent_id | text | ID родительской категории |
| original_id | text | Оригинальный ID категории из исходного фида |
| created_at | timestamp | Дата и время создания |
| updated_at | timestamp | Дата и время последнего обновления |

### products
Таблица товаров.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Первичный ключ |
| feed_id | uuid | Внешний ключ на feeds.id |
| name | text | Название товара |
| description | text | Описание товара |
| price | numeric | Цена товара |
| old_price | numeric | Старая цена товара (для скидок) |
| currency | text | Валюта цены |
| category_original_id | text | Внешний ключ на categories.original_id |
| url | text | URL товара в магазине |
| generated_url | text | Сгенерированный URL товара |
| include_in_export | boolean | Флаг включения товара в экспорт |
| pictures | text[] | Массив URL изображений товара |
| vendor | text | Производитель товара |
| vendor_code | text | Артикул производителя |
| available | boolean | Флаг наличия товара |
| attributes | jsonb | Атрибуты товара в формате JSON |
| external_id | text | Внешний ID товара из исходного фида |
| created_at | timestamp | Дата и время создания |
| updated_at | timestamp | Дата и время последнего обновления |

### feed_ai_settings
Таблица настроек AI для каждого фида.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Первичный ключ |
| feed_id | uuid | Внешний ключ на feeds.id |
| name_prompt | text | Промпт для генерации названий |
| description_prompt | text | Промпт для генерации описаний |
| title_prompt | text | Промпт для генерации заголовков |
| summary_prompt | text | Промпт для генерации кратких описаний |
| language | text | Язык генерации |
| tone | text | Тон генерации |
| max_tokens | integer | Максимальное количество токенов для генерации |
| created_at | timestamp | Дата и время создания |
| updated_at | timestamp | Дата и время последнего обновления |

### ai_settings
Таблица общих настроек AI для пользователя.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Первичный ключ |
| user_id | uuid | Внешний ключ на profiles.id |
| api_key | text | Ключ API для доступа к сервису AI |
| base_url | text | Базовый URL сервиса AI |
| model | text | Модель AI |
| default_name_prompt | text | Промпт по умолчанию для генерации названий |
| default_description_prompt | text | Промпт по умолчанию для генерации описаний |
| default_title_prompt | text | Промпт по умолчанию для генерации заголовков |
| default_summary_prompt | text | Промпт по умолчанию для генерации кратких описаний |
| default_language | text | Язык генерации по умолчанию |
| default_tone | text | Тон генерации по умолчанию |
| default_max_tokens | integer | Максимальное количество токенов по умолчанию |
| created_at | timestamp | Дата и время создания |
| updated_at | timestamp | Дата и время последнего обновления |

### logs
Таблица логов действий пользователей.

| Поле | Тип | Описание |
|------|-----|----------|
| id | uuid | Первичный ключ |
| user_id | uuid | Внешний ключ на profiles.id |
| feed_id | uuid | Внешний ключ на feeds.id |
| action | text | Действие пользователя |
| details | jsonb | Детали действия в формате JSON |
| created_at | timestamp | Дата и время создания |

## Связи между таблицами

- `profiles` ← `feeds` (user_id)
- `feeds` ← `categories` (feed_id)
- `feeds` ← `products` (feed_id)
- `categories` ← `products` (category_original_id, feed_id) → (original_id, feed_id)
- `feeds` ← `feed_ai_settings` (feed_id)
- `profiles` ← `ai_settings` (user_id)
- `profiles` ← `logs` (user_id)
- `feeds` ← `logs` (feed_id)

## Важные особенности схемы

1. **Связь продуктов с категориями** осуществляется через поля `category_original_id` в таблице `products` и `original_id` в таблице `categories`. Это позволяет сохранять оригинальные идентификаторы категорий из исходных фидов.

2. **Уникальность товаров** обеспечивается комбинацией полей `(feed_id, external_id)` в таблице `products`.

3. **Уникальность категорий** обеспечивается комбинацией полей `(feed_id, original_id)` в таблице `categories`.

4. **Автоматическое обновление полей `updated_at`** осуществляется через триггеры `update_[table_name]_timestamp` для каждой таблицы.

## Лучшие практики

### При создании новых таблиц

1. Используйте UUID в качестве первичных ключей:
   ```sql
   id uuid NOT NULL DEFAULT gen_random_uuid()
   ```

2. Добавляйте временные метки `created_at` и `updated_at`:
   ```sql
   created_at timestamp with time zone NOT NULL DEFAULT now(),
   updated_at timestamp with time zone NOT NULL DEFAULT now()
   ```

3. Создавайте триггер для обновления `updated_at`:
   ```sql
   CREATE TRIGGER update_[table_name]_timestamp
   BEFORE UPDATE ON [table_name]
   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
   ```

### При импорте данных

1. Обрабатывайте данные батчами (по 1000 записей) для оптимальной производительности.
2. Используйте `upsert` вместо `insert` для обработки дубликатов:
   ```typescript
   await supabase
     .from('table_name')
     .upsert(batch, { 
       onConflict: 'conflict_column',
       ignoreDuplicates: false 
     });
   ```
3. Для категорий всегда сохраняйте оригинальный ID в поле `original_id`.
4. Для товаров всегда сохраняйте внешний ID в поле `external_id`.

### При изменении схемы базы данных

1. Всегда создавайте миграцию для изменений схемы (используйте скрипт `supabase/create_migration.sh`).
2. Документируйте изменения в `supabase/migrations/README.md`.
3. Проверяйте миграцию на локальной копии базы данных перед применением на продакшн.
4. Делайте миграции идемпотентными (безопасными для повторного выполнения).

## Работа с Supabase

### Проверка структуры таблиц

Для просмотра структуры таблиц используйте панель управления Supabase: 
1. Откройте проект в консоли Supabase
2. Перейдите в раздел "Table Editor"
3. Выберите нужную таблицу и нажмите "Edit"

### Выполнение SQL-запросов

Для выполнения произвольных SQL-запросов:
1. Откройте проект в консоли Supabase
2. Перейдите в раздел "SQL Editor"
3. Создайте новый запрос или откройте существующий
4. Выполните запрос

### Управление миграциями

Для применения миграций в локальном окружении используйте Supabase CLI:

```bash
npx supabase migration up
```

Для создания новой миграции:

```bash
cd supabase
./create_migration.sh имя_миграции
```

## Решение проблем

### Ошибка "there is no unique or exclusion constraint matching the ON CONFLICT specification"

Эта ошибка возникает, когда вы используете `upsert` с `onConflict`, но указанное ограничение уникальности не существует в таблице.

**Решение**:
1. Убедитесь, что в таблице существует ограничение уникальности для указанных колонок.
2. Создайте ограничение уникальности, если его нет:
   ```sql
   ALTER TABLE public.table_name 
   ADD CONSTRAINT unique_constraint_name UNIQUE (column1, column2);
   ```
3. Можно также использовать простой `insert` вместо `upsert`, если ограничение не критично:
   ```typescript
   if (error && error.code === '42P10') {
     console.warn('Ограничение уникальности не найдено, используем обычный insert');
     await supabase.from('table_name').insert(batch);
   }
   ```

### Ошибка "invalid input syntax for type uuid"

Эта ошибка возникает, когда вы пытаетесь вставить значение неправильного формата в поле типа UUID.

**Решение**:
1. Всегда генерируйте валидные UUID для полей с типом UUID:
   ```typescript
   id: crypto.randomUUID()
   ```
2. Если значение может не быть UUID, используйте другой тип данных (например, TEXT).
3. При миграции с UUID на другой тип, используйте оператор USING для преобразования:
   ```sql
   ALTER TABLE public.table_name 
   ALTER COLUMN column_name TYPE text USING column_name::text;
   ``` 