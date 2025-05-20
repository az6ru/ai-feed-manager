-- Таблица профилей пользователей
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Таблица фидов
CREATE TABLE feeds (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    date_created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    date_modified TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version TEXT NOT NULL,
    is_published BOOLEAN,
    published_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Таблица категорий
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Таблица продуктов
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    old_price NUMERIC,
    currency TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    url TEXT,
    generated_url TEXT,
    include_in_export BOOLEAN,
    pictures TEXT[],
    vendor TEXT,
    vendor_code TEXT,
    available BOOLEAN,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    weight NUMERIC,
    dimensions TEXT,
    condition JSONB,
    generated_name TEXT,
    generated_description TEXT,
    merged_from_variants INTEGER,
    merged_attributes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Таблица настроек AI
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    api_key TEXT,
    base_url TEXT,
    model TEXT,
    default_name_prompt TEXT,
    default_description_prompt TEXT,
    default_title_prompt TEXT,
    default_summary_prompt TEXT,
    default_language TEXT,
    default_tone TEXT,
    default_max_tokens INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Таблица настроек AI для конкретных фидов
CREATE TABLE feed_ai_settings (
    id UUID PRIMARY KEY,
    feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
    name_prompt TEXT,
    description_prompt TEXT,
    title_prompt TEXT,
    summary_prompt TEXT,
    language TEXT,
    tone TEXT,
    max_tokens INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Таблица логов
CREATE TABLE logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    feed_id UUID REFERENCES feeds(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Создание индексов для улучшения производительности
CREATE INDEX idx_feeds_user_id ON feeds(user_id);
CREATE INDEX idx_categories_feed_id ON categories(feed_id);
CREATE INDEX idx_products_feed_id ON products(feed_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_feed_id ON logs(feed_id);
CREATE INDEX idx_ai_settings_user_id ON ai_settings(user_id);
CREATE INDEX idx_feed_ai_settings_feed_id ON feed_ai_settings(feed_id);

-- Создание триггеров для автоматического обновления времени
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF TG_TABLE_NAME = 'feeds' THEN
        NEW.date_modified = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feeds_timestamp
    BEFORE UPDATE ON feeds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_timestamp
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_categories_timestamp
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_settings_timestamp
    BEFORE UPDATE ON ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_feed_ai_settings_timestamp
    BEFORE UPDATE ON feed_ai_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
