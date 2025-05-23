-- Эта миграция создает базовую структуру базы данных для приложения AI Feed Manager
-- Сначала создаем функцию для автоматического обновления временных меток

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  display_name text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 2. Таблица фидов
CREATE TABLE IF NOT EXISTS public.feeds (
  id uuid NOT NULL,
  user_id uuid NULL,
  name text NOT NULL,
  source text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  date_created timestamp with time zone NOT NULL DEFAULT now(),
  date_modified timestamp with time zone NOT NULL DEFAULT now(),
  version text NOT NULL,
  is_published boolean NULL,
  published_url text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  products_count integer NOT NULL DEFAULT 0,
  categories_count integer NOT NULL DEFAULT 0,
  CONSTRAINT feeds_pkey PRIMARY KEY (id),
  CONSTRAINT feeds_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 3. Таблица категорий
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feed_id uuid NULL,
  name text NOT NULL,
  parent_id text NULL,
  original_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT unique_feed_original_id UNIQUE (feed_id, original_id),
  CONSTRAINT categories_feed_id_fkey FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 4. Таблица товаров
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL,
  feed_id uuid NULL,
  name text NOT NULL,
  description text NULL,
  price numeric NOT NULL,
  old_price numeric NULL,
  currency text NOT NULL,
  category_original_id text NULL,
  url text NULL,
  generated_url text NULL,
  include_in_export boolean NULL,
  pictures text[] NULL,
  vendor text NULL,
  vendor_code text NULL,
  available boolean NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  weight numeric NULL,
  dimensions text NULL,
  condition jsonb NULL,
  generated_name text NULL,
  generated_description text NULL,
  merged_from_variants integer NULL,
  merged_attributes text[] NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  merged_sizes text[] NULL,
  external_id text NULL,
  merged_external_ids text[] NULL,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_feed_id_fkey FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE,
  CONSTRAINT unique_feed_external_id UNIQUE (feed_id, external_id)
) TABLESPACE pg_default;

-- 5. Настройки AI для каждого фида
CREATE TABLE IF NOT EXISTS public.feed_ai_settings (
  id uuid NOT NULL,
  feed_id uuid NULL,
  name_prompt text NULL,
  description_prompt text NULL,
  title_prompt text NULL,
  summary_prompt text NULL,
  language text NULL,
  tone text NULL,
  max_tokens integer NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feed_ai_settings_pkey PRIMARY KEY (id),
  CONSTRAINT feed_ai_settings_feed_id_fkey FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 6. Общие настройки AI для пользователя
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  api_key text NULL,
  base_url text NULL,
  model text NULL,
  default_name_prompt text NULL,
  default_description_prompt text NULL,
  default_title_prompt text NULL,
  default_summary_prompt text NULL,
  default_language text NULL,
  default_tone text NULL,
  default_max_tokens integer NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_pkey PRIMARY KEY (id),
  CONSTRAINT ai_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT ai_settings_user_id_key UNIQUE (user_id)
) TABLESPACE pg_default;

-- 7. Логи действий
CREATE TABLE IF NOT EXISTS public.logs (
  id uuid NOT NULL,
  user_id uuid NULL,
  feed_id uuid NULL,
  action text NOT NULL,
  details jsonb NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT logs_pkey PRIMARY KEY (id),
  CONSTRAINT logs_feed_id_fkey FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE SET NULL,
  CONSTRAINT logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE SET NULL
) TABLESPACE pg_default;

-- Создаем внешние ключи для связи продуктов и категорий
ALTER TABLE public.products
ADD CONSTRAINT products_category_original_id_fkey 
FOREIGN KEY (category_original_id, feed_id) 
REFERENCES categories (original_id, feed_id);

-- Создаем индексы для ускорения запросов

-- Индексы для фидов
CREATE INDEX IF NOT EXISTS idx_feeds_user_id 
ON public.feeds USING btree (user_id) 
TABLESPACE pg_default;

-- Индексы для категорий
CREATE INDEX IF NOT EXISTS idx_categories_feed_id 
ON public.categories USING btree (feed_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_categories_original_id 
ON public.categories USING btree (original_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_categories_feed_original_id 
ON public.categories USING btree (feed_id, original_id) 
TABLESPACE pg_default;

-- Индексы для товаров
CREATE INDEX IF NOT EXISTS idx_products_feed_id 
ON public.products USING btree (feed_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_products_external_id 
ON public.products USING btree (external_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_products_feed_external_id 
ON public.products USING btree (feed_id, external_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_products_category_id 
ON public.products USING btree (category_original_id) 
TABLESPACE pg_default;

-- Индексы для настроек AI
CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id 
ON public.ai_settings USING btree (user_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_feed_ai_settings_feed_id 
ON public.feed_ai_settings USING btree (feed_id) 
TABLESPACE pg_default;

-- Индексы для логов
CREATE INDEX IF NOT EXISTS idx_logs_user_id 
ON public.logs USING btree (user_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_logs_feed_id 
ON public.logs USING btree (feed_id) 
TABLESPACE pg_default;

-- Создаем триггеры для автоматического обновления временных меток

-- Триггер для профилей
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер для фидов
CREATE TRIGGER update_feeds_timestamp
BEFORE UPDATE ON feeds
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер для категорий
CREATE TRIGGER update_categories_timestamp
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер для товаров
CREATE TRIGGER update_products_timestamp
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер для настроек AI фида
CREATE TRIGGER update_feed_ai_settings_timestamp
BEFORE UPDATE ON feed_ai_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер для настроек AI пользователя
CREATE TRIGGER update_ai_settings_timestamp
BEFORE UPDATE ON ai_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
