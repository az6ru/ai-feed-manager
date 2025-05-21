// Это заготовка для будущей интеграции с Supabase
// Для полноценной работы нужно установить @supabase/supabase-js
// и добавить ключи API в .env файл

import { createClient, SupabaseClient, Session, AuthError, User } from '@supabase/supabase-js';

// Получаем переменные окружения
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Интерфейсы таблиц Supabase
interface FeedRecord {
  id: string;
  name: string;
  date_created: string;
  date_modified: string;
  metadata: Record<string, any>;
  version: number;
}

interface ProductRecord {
  id: string;
  feed_id: string;
  name: string;
  description?: string;
  price: number;
  old_price?: number;
  currency: string;
  category_id: string;
  url?: string;
  pictures?: string[];
  vendor?: string;
  vendor_code?: string;
  available: boolean;
  attributes: Record<string, any>[];
}

interface CategoryRecord {
  id: string;
  feed_id: string;
  name: string;
  parent_id?: string;
}

// Когда будем готовы к интеграции с Supabase
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

// --- Вспомогательные функции для преобразования кейсов ---
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
        toCamelCase(value),
      ])
    );
  }
  return obj;
}

function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()),
        toSnakeCase(value),
      ])
    );
  }
  return obj;
}

// --- Авторизация ---
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// --- Пример универсального запроса с преобразованием кейсов ---
export async function selectFrom<T = any>(table: string, filters: Record<string, any> = {}) {
  let query = supabase.from(table).select();
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  const { data, error } = await query;
  if (error) throw error;
  return toCamelCase(data) as T[];
}

export async function insertTo<T = any>(table: string, values: Record<string, any>) {
  const { data, error } = await supabase.from(table).insert(toSnakeCase(values)).select();
  if (error) throw error;
  return toCamelCase(data) as T[];
}

export async function updateIn<T = any>(table: string, id: string, values: Record<string, any>) {
  const { data, error } = await supabase.from(table).update(toSnakeCase(values)).eq('id', id).select();
  if (error) throw error;
  return toCamelCase(data) as T[];
}

export async function deleteFrom(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Функции для будущей интеграции
export async function saveFeedToSupabase(feed: any): Promise<string> {
  // Псевдокод для сохранения фида в Supabase
  console.log('Saving feed to Supabase:', feed.name);
  // 1. Сохранить основную информацию о фиде
  // 2. Сохранить категории
  // 3. Сохранить товары батчами
  return feed.id;
}

export async function getFeedFromSupabase(feedId: string): Promise<any> {
  // Псевдокод для получения фида из Supabase
  console.log('Getting feed from Supabase:', feedId);
  // 1. Получить основную информацию о фиде
  // 2. Получить категории
  // 3. Получить товары с пагинацией
  return null;
}

export async function getAllFeedsFromSupabase(): Promise<any[]> {
  // Псевдокод для получения списка фидов из Supabase
  console.log('Getting all feeds from Supabase');
  // Получить список всех фидов без товаров и категорий
  return [];
}

export async function updateProductInSupabase(feedId: string, productId: string, updates: any): Promise<void> {
  // Псевдокод для обновления товара в Supabase
  console.log('Updating product in Supabase:', productId);
  // Обновить информацию о товаре
}

export async function deleteFeedFromSupabase(feedId: string): Promise<void> {
  // Псевдокод для удаления фида из Supabase
  console.log('Deleting feed from Supabase:', feedId);
  // 1. Удалить товары
  // 2. Удалить категории
  // 3. Удалить информацию о фиде
}

// --- AI Settings ---
export async function getAiSettings(userId: string) {
  const { data, error } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data ? toCamelCase(data) : null;
}

export async function upsertAiSettings(userId: string, values: Record<string, any>) {
  const base = { ...values, userId };
  if ('id' in base && !base.id) delete base.id;
  const payload = toSnakeCase(base);
  const { data, error } = await supabase
    .from('ai_settings')
    .upsert([payload], { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return toCamelCase(data);
}

export async function getOrCreateProfile(user: { id: string, email: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (data) return data;
  // Если нет — создаём профиль
  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert([{ id: user.id, email: user.email }])
    .select()
    .single();
  if (createError) throw createError;
  return created;
}

// --- FEEDS ---
export async function getFeeds(userId: string) {
  const { data, error } = await supabase
    .from('feeds')
    .select('id, name, date_created, date_modified, metadata, version, products_count, categories_count, ai_settings')
    .eq('user_id', userId);
  if (error) throw error;
  
  // Преобразуем ai_settings в aiSettings для всех фидов
  const result = toCamelCase(data);
  return result.map((feed: any) => {
    if (feed.ai_settings) {
      feed.aiSettings = toCamelCase(feed.ai_settings);
      delete feed.ai_settings;
    }
    return feed;
  });
}

export async function getFeed(feedId: string) {
  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('id', feedId)
    .single();
  if (error) throw error;
  
  // Преобразуем ai_settings в aiSettings для клиента
  const result = toCamelCase(data);
  if (result.ai_settings) {
    result.aiSettings = toCamelCase(result.ai_settings);
    delete result.ai_settings;
  }
  
  return result;
}

export async function createFeed(feed: any) {
  // Обработка aiSettings, если они присутствуют
  const feedData = { ...feed };
  
  // Если есть настройки AI, преобразуем их в snake_case для базы данных
  if (feedData.aiSettings) {
    feedData.ai_settings = toSnakeCase(feedData.aiSettings);
    delete feedData.aiSettings; // Удаляем оригинальное поле
  }
  
  const { data, error } = await supabase
    .from('feeds')
    .insert([toSnakeCase(feedData)])
    .select()
    .single();
  if (error) throw error;
  
  // Преобразуем ai_settings обратно в aiSettings для клиента
  const result = toCamelCase(data);
  if (result.ai_settings) {
    result.aiSettings = toCamelCase(result.ai_settings);
    delete result.ai_settings;
  }
  
  return result;
}

export async function updateFeed(feedId: string, updates: any) {
  // Обработка aiSettings, если они присутствуют
  const updatedData = { ...updates };
  
  // Если есть настройки AI, сериализуем их в JSON для хранения в БД
  if (updatedData.aiSettings) {
    updatedData.ai_settings = toSnakeCase(updatedData.aiSettings);
    delete updatedData.aiSettings; // Удаляем оригинальное поле, чтобы избежать дублирования
  }
  
  const { data, error } = await supabase
    .from('feeds')
    .update(toSnakeCase(updatedData))
    .eq('id', feedId)
    .select()
    .single();
  if (error) throw error;
  
  // Преобразуем ai_settings обратно в aiSettings для клиента
  const result = toCamelCase(data);
  if (result.ai_settings) {
    result.aiSettings = toCamelCase(result.ai_settings);
    delete result.ai_settings;
  }
  
  return result;
}

export async function deleteFeed(feedId: string) {
  const { error } = await supabase
    .from('feeds')
    .delete()
    .eq('id', feedId);
  if (error) throw error;
  return true;
}

// --- CATEGORIES ---
export async function getCategories(feedId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('feed_id', feedId);
  if (error) throw error;
  return toCamelCase(data);
}

export async function createCategory(category: any) {
  const { data, error } = await supabase
    .from('categories')
    .insert([toSnakeCase(category)])
    .select()
    .single();
  if (error) throw error;
  return toCamelCase(data);
}

export async function updateCategory(categoryId: string, updates: any) {
  const { data, error } = await supabase
    .from('categories')
    .update(toSnakeCase(updates))
    .eq('id', categoryId)
    .select()
    .single();
  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);
  if (error) throw error;
  return true;
}

// --- PRODUCTS ---
export async function getProducts(feedId: string) {
  const PAGE_SIZE = 1000;
  let allProducts: any[] = [];
  let page = 0;
  let fetched = 0;
  let total = 0;
  do {
    const { data, error, count } = await supabase
    .from('products')
      .select('*', { count: 'exact' })
      .eq('feed_id', feedId)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
    if (data) allProducts = allProducts.concat(data);
    fetched += data?.length || 0;
    total = count ?? fetched;
    page++;
  } while (fetched < total);
  return toCamelCase(allProducts);
}

export async function createProduct(product: any) {
  const { data, error } = await supabase
    .from('products')
    .insert([toSnakeCase(product)])
    .select()
    .single();
  if (error) throw error;
  return toCamelCase(data);
}

export async function updateProduct(productId: string, updates: any) {
  const { data, error } = await supabase
    .from('products')
    .update(toSnakeCase(updates))
    .eq('id', productId)
    .select()
    .single();
  if (error) throw error;
  return toCamelCase(data);
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
  if (error) throw error;
  return true;
}

// --- BATCH INSERT ---
export async function batchInsertProducts(products: any[], feedId: string) {
  const BATCH_SIZE = 1000;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE).map(p => {
      const { externalId, ...rest } = p;
      return { ...toSnakeCase(rest), feed_id: feedId, external_id: externalId };
    });
    const { error } = await supabase.from('products').insert(batch);
    if (error) throw error;
  }
}

export async function batchInsertCategories(categories: any[], feedId: string) {
  const BATCH_SIZE = 1000;
  for (let i = 0; i < categories.length; i += BATCH_SIZE) {
    const batch = categories.slice(i, i + BATCH_SIZE).map(c => ({ ...toSnakeCase(c), feed_id: feedId }));
    const { error } = await supabase.from('categories').insert(batch);
    if (error) throw error;
  }
}

// Функция для обновления счетчиков товаров и категорий
export async function updateFeedCounters(feedId: string) {
  // Считаем количество товаров
  const { count: productsCount, error: err1 } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('feed_id', feedId);
  if (err1) throw err1;
  // Считаем количество категорий
  const { count: categoriesCount, error: err2 } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
    .eq('feed_id', feedId);
  if (err2) throw err2;
  // Обновляем поля в feeds
  await supabase
    .from('feeds')
    .update({ products_count: productsCount, categories_count: categoriesCount })
    .eq('id', feedId);
} 