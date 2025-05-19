-- FEEDS
drop table if exists feeds cascade;
create table feeds (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid references auth.users(id),
  "name" text not null,
  "metadata" jsonb,
  "createdAt" timestamp default now(),
  "dateCreated" timestamp default now(),
  "dateModified" timestamp default now(),
  "version" text,
  "source" text,
  "aiSettings" jsonb,
  "isPublished" boolean,
  "publishedUrl" text
);

-- CATEGORIES
drop table if exists categories cascade;
create table categories (
  "id" text primary key,
  "feed_id" uuid references feeds("id") on delete cascade,
  "name" text not null,
  "parentId" text
);

-- PRODUCTS
drop table if exists products cascade;
create table products (
  "id" text primary key,
  "feed_id" uuid references feeds("id") on delete cascade,
  "name" text not null,
  "description" text,
  "price" numeric,
  "oldPrice" numeric,
  "currency" text,
  "categoryId" text,
  "url" text,
  "generatedUrl" text,
  "includeInExport" boolean,
  "picture" jsonb,
  "vendor" text,
  "vendorCode" text,
  "available" boolean,
  "attributes" jsonb,
  "weight" numeric,
  "dimensions" text,
  "condition" jsonb,
  "generatedName" text,
  "generatedDescription" text,
  "mergedFromVariants" integer,
  "mergedAttributes" jsonb
);

-- FEED HISTORY
drop table if exists feed_history cascade;
create table feed_history (
  "id" uuid primary key default gen_random_uuid(),
  "feed_id" uuid references feeds("id") on delete cascade,
  "version" integer,
  "timestamp" timestamp default now(),
  "changes" jsonb,
  "author" text
);

-- LOGS
drop table if exists logs cascade;
create table logs (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid references auth.users(id),
  "action" text,
  "details" jsonb,
  "createdAt" timestamp default now()
);

-- USER AI SETTINGS
drop table if exists user_ai_settings cascade;
create table user_ai_settings (
  "id" uuid primary key default gen_random_uuid(),
  "user_id" uuid references auth.users(id),
  "apiKey" text,
  "baseUrl" text,
  "model" text,
  "defaultNamePrompt" text,
  "defaultDescriptionPrompt" text,
  "defaultTitlePrompt" text,
  "defaultSummaryPrompt" text,
  "defaultLanguage" text,
  "defaultTone" text,
  "defaultMaxTokens" integer,
  "createdAt" timestamp default now()
);