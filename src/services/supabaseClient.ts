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
  try {
    console.log('Получение настроек AI для пользователя:', userId);
    
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Ошибка при получении настроек AI:', error);
      throw error;
    }
    
    if (!data) {
      console.log('Настройки AI не найдены для пользователя:', userId);
      return null;
    }
    
    console.log('Получены сырые настройки AI:', data);
    
    // Преобразуем snake_case в camelCase и маппим поля из базы данных в нужный формат
    const result = {
      apiKey: data.api_key || '',
      baseUrl: data.base_url || 'https://api.openai.com/v1',
      model: data.model || 'gpt-3.5-turbo',
      defaultNamePrompt: data.default_name_prompt || '',
      defaultDescriptionPrompt: data.default_description_prompt || '',
      defaultTitlePrompt: data.default_title_prompt || '',
      defaultSummaryPrompt: data.default_summary_prompt || '',
      defaultLanguage: data.default_language || 'ru',
      defaultTone: data.default_tone || 'профессиональный',
      defaultMaxTokens: data.default_max_tokens || 150
    };
    
    console.log('Преобразованные настройки AI:', result);
    return result;
  } catch (error) {
    console.error('Исключение при получении настроек AI:', error);
    throw error;
  }
}

export async function upsertAiSettings(userId: string, values: Record<string, any>) {
  try {
    console.log('Сохранение настроек AI для пользователя:', userId);
    
    // Преобразуем camelCase в snake_case
    const payload = {
      user_id: userId,
      api_key: values.apiKey || '',
      base_url: values.baseUrl || 'https://api.openai.com/v1',
      model: values.model || 'gpt-3.5-turbo',
      default_name_prompt: values.defaultNamePrompt || '',
      default_description_prompt: values.defaultDescriptionPrompt || '',
      default_title_prompt: values.defaultTitlePrompt || '',
      default_summary_prompt: values.defaultSummaryPrompt || '',
      default_language: values.defaultLanguage || 'ru',
      default_tone: values.defaultTone || 'профессиональный',
      default_max_tokens: values.defaultMaxTokens || 150
    };
    
    console.log('Подготовленные данные для сохранения:', payload);
    
    const { data, error } = await supabase
      .from('ai_settings')
      .upsert([payload], { onConflict: 'user_id' })
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Ошибка при сохранении настроек AI:', error);
      throw error;
    }
    
    console.log('Настройки AI успешно сохранены, результат:', data);
    
    // Преобразуем обратно в camelCase для возврата
    return {
      apiKey: data?.api_key || '',
      baseUrl: data?.base_url || 'https://api.openai.com/v1',
      model: data?.model || 'gpt-3.5-turbo',
      defaultNamePrompt: data?.default_name_prompt || '',
      defaultDescriptionPrompt: data?.default_description_prompt || '',
      defaultTitlePrompt: data?.default_title_prompt || '',
      defaultSummaryPrompt: data?.default_summary_prompt || '',
      defaultLanguage: data?.default_language || 'ru',
      defaultTone: data?.default_tone || 'профессиональный',
      defaultMaxTokens: data?.default_max_tokens || 150
    };
  } catch (error) {
    console.error('Исключение при сохранении настроек AI:', error);
    throw error;
  }
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
  // Проверяем, что userId задан
  if (!userId) {
    console.error('getFeeds called with empty userId');
    return [];
  }
  
  try {
    // Сначала проверим структуру таблицы feeds, чтобы определить правильное имя поля
    console.log('Checking feeds table structure');
    
    // Попробуем разные возможные имена поля для ID пользователя
    const possibleUserIdFields = ['user_id', 'userId', 'owner_id', 'ownerId', 'created_by', 'createdBy'];
    
    // Дебаг-информация
    console.log('Trying to fetch feeds with userId:', userId);
    
    // Основной запрос с user_id
    let { data, error } = await supabase
      .from('feeds')
      .select('id, name, date_created, date_modified, metadata, version, products_count, categories_count')
      .eq('user_id', userId);
    
    if (error) {
      console.warn('Error with user_id field, trying alternative fields:', error.message);
      
      // Пробуем альтернативные поля
      for (const field of possibleUserIdFields.slice(1)) { // Пропускаем 'user_id', т.к. уже пробовали
        console.log(`Trying with field: ${field}`);
        
        const result = await supabase
          .from('feeds')
          .select('id, name, date_created, date_modified, metadata, version, products_count, categories_count')
          .eq(field, userId);
        
        if (!result.error && result.data && result.data.length > 0) {
          console.log(`Found feeds using field: ${field}`);
          data = result.data;
          error = null;
          break;
        }
      }
    }
    
    if (error) {
      console.error('Failed to fetch feeds with all field variations:', error);
      throw error;
    }
    
    console.log('Feeds fetched successfully:', data?.length || 0);
    return toCamelCase(data || []);
  } catch (e) {
    console.error('Exception in getFeeds:', e);
    throw e;
  }
}

export async function getFeed(feedId: string) {
  try {
    // Получаем основные данные фида
    const { data, error } = await supabase
      .from('feeds')
      .select('*')
      .eq('id', feedId)
      .single();
      
    if (error) {
      console.error('Ошибка при получении фида:', error);
      throw error;
    }
    
    // Преобразуем результат в camelCase
    const result = toCamelCase(data);
    
    // Загружаем настройки AI для фида из отдельной таблицы
    try {
      const aiSettings = await getFeedAiSettings(feedId);
      if (aiSettings) {
        result.aiSettings = aiSettings;
      }
    } catch (err) {
      console.error('Ошибка при загрузке настроек AI для фида:', err);
      // Не выбрасываем ошибку, чтобы не блокировать загрузку фида
    }
    
    return result;
  } catch (error) {
    console.error('Исключение при получении фида:', error);
    throw error;
  }
}

export async function createFeed(feed: any) {
  try {
    console.log('Создание нового фида:', feed);
    
    // Обработка aiSettings, если они присутствуют
    const feedData = { ...feed };
    const aiSettings = feedData.aiSettings;
    
    // Удаляем aiSettings из данных фида, так как они сохраняются в отдельной таблице
    if (feedData.aiSettings) {
      delete feedData.aiSettings;
    }
    
    // Создаем новый фид
    const { data, error } = await supabase
      .from('feeds')
      .insert([toSnakeCase(feedData)])
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при создании фида:', error);
      throw error;
    }
    
    // Преобразуем результат в camelCase
    const result = toCamelCase(data);
    
    // Если были переданы настройки AI, сохраняем их в отдельную таблицу
    if (aiSettings) {
      console.log('Сохранение настроек AI для нового фида:', result.id, aiSettings);
      try {
        const savedAiSettings = await upsertFeedAiSettings(result.id, aiSettings);
        result.aiSettings = savedAiSettings;
      } catch (err) {
        console.error('Ошибка при сохранении настроек AI для нового фида:', err);
        // Не выбрасываем ошибку, чтобы не блокировать создание фида
      }
    }
    
    return result;
  } catch (error) {
    console.error('Исключение при создании фида:', error);
    throw error;
  }
}

export async function updateFeed(feedId: string, updates: any) {
  try {
    console.log('Обновление фида:', feedId, updates);
    
    // Обработка aiSettings, если они присутствуют
    const updatedData = { ...updates };
    const aiSettings = updatedData.aiSettings;
    
    // Удаляем aiSettings из данных фида, так как они сохраняются в отдельной таблице
    if (updatedData.aiSettings) {
      delete updatedData.aiSettings;
    }
    
    // Обновляем основные данные фида
    const { data, error } = await supabase
      .from('feeds')
      .update(toSnakeCase(updatedData))
      .eq('id', feedId)
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при обновлении фида:', error);
      throw error;
    }
    
    // Преобразуем результат в camelCase
    const result = toCamelCase(data);
    
    // Если были переданы настройки AI, сохраняем их в отдельную таблицу
    if (aiSettings) {
      console.log('Сохранение настроек AI для фида:', feedId, aiSettings);
      try {
        const savedAiSettings = await upsertFeedAiSettings(feedId, aiSettings);
        result.aiSettings = savedAiSettings;
      } catch (err) {
        console.error('Ошибка при сохранении настроек AI для фида:', err);
        // Не выбрасываем ошибку, чтобы не блокировать обновление фида
      }
    } else {
      // Если настройки не переданы, пробуем загрузить существующие
      try {
        const existingAiSettings = await getFeedAiSettings(feedId);
        if (existingAiSettings) {
          result.aiSettings = existingAiSettings;
        }
      } catch (err) {
        console.error('Ошибка при загрузке настроек AI для фида:', err);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Исключение при обновлении фида:', error);
    throw error;
  }
}

export async function deleteFeed(feedId: string) {
  try {
    console.log('Удаление фида:', feedId);
    
    // Сначала удаляем настройки AI для фида
    try {
      const { error: aiSettingsError } = await supabase
        .from('feed_ai_settings')
        .delete()
        .eq('feed_id', feedId);
      
      if (aiSettingsError) {
        console.warn('Ошибка при удалении настроек AI для фида:', aiSettingsError);
        // Продолжаем выполнение, так как это не критическая ошибка
      } else {
        console.log('Настройки AI для фида успешно удалены');
      }
    } catch (err) {
      console.warn('Исключение при удалении настроек AI для фида:', err);
      // Продолжаем выполнение, так как это не критическая ошибка
    }
    
    // Затем удаляем сам фид
    const { error } = await supabase
      .from('feeds')
      .delete()
      .eq('id', feedId);
    
    if (error) {
      console.error('Ошибка при удалении фида:', error);
      throw error;
    }
    
    console.log('Фид успешно удален');
    return true;
  } catch (error) {
    console.error('Исключение при удалении фида:', error);
    throw error;
  }
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
  try {
    // Проверяем наличие продукта перед обновлением
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking product existence:', checkError);
      throw checkError;
    }
    
    if (!existingProduct) {
      console.error('Product not found for update:', productId);
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    // Выполняем обновление
    const { data, error } = await supabase
      .from('products')
      .update(toSnakeCase(updates))
      .eq('id', productId)
      .select()
      .maybeSingle();
    
    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
    
    return toCamelCase(data);
  } catch (error) {
    console.error('Exception in updateProduct:', error);
    throw error;
  }
}

export async function deleteProduct(productId: string) {
  try {
    // Сначала проверяем, существует ли продукт
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking product existence:', checkError);
      throw checkError;
    }
    
    if (!existingProduct) {
      console.error('Product not found for deletion:', productId);
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    // Выполняем удаление
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in deleteProduct:', error);
    throw error;
  }
}

// --- BATCH INSERT ---
export async function batchInsertProducts(products: any[], feedId: string) {
  const BATCH_SIZE = 1000;
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`Начинаем импорт ${products.length} товаров в фид ${feedId}`);
  
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const currentBatch = products.slice(i, i + BATCH_SIZE).map(p => {
      const { externalId, categoryId, ...rest } = p;
      return { 
        ...toSnakeCase(rest), 
        feed_id: feedId, 
        external_id: externalId,
        category_original_id: categoryId // Используем categoryId как original_id для категории
      };
    });
    
    // Используем upsert вместо insert для обработки потенциальных дубликатов
    // Важно: мы будем определять уникальность по комбинации (feed_id, external_id)
    // Используем ON CONFLICT DO NOTHING, чтобы не обновлять существующие записи
    try {
      // Сначала пробуем вставку с ON CONFLICT
      try {
        const { data, error } = await supabase
          .from('products')
          .upsert(currentBatch, { 
            onConflict: 'feed_id,external_id',
            ignoreDuplicates: false // Мы обрабатываем дубликаты через onConflict
          });
        
        if (error) {
          // Если ошибка связана с отсутствием ограничения unique, используем обычный insert
          if (error.code === '42P10') {
            console.warn('Ограничение unique_feed_external_id не найдено, используем обычный insert');
            const { error: insertError } = await supabase
              .from('products')
              .insert(currentBatch);
            
            if (insertError) {
              throw insertError;
            }
          } else {
            throw error;
          }
        }
      } catch (upsertError: any) {
        // Если ошибка связана с отсутствием ограничения unique, используем обычный insert
        if (upsertError.code === '42P10') {
          console.warn('Ограничение unique_feed_external_id не найдено, используем обычный insert');
          const { error: insertError } = await supabase
            .from('products')
            .insert(currentBatch);
          
          if (insertError) {
            throw insertError;
          }
        } else {
          throw upsertError;
        }
      }
      
      console.log(`Успешно импортировано ${currentBatch.length} товаров (батч ${i / BATCH_SIZE + 1})`);
      successCount += currentBatch.length;
    } catch (err) {
      console.error(`Исключение при импорте батча товаров (${i} - ${i + BATCH_SIZE}):`, err);
      errorCount += BATCH_SIZE;
    }
  }
  
  console.log(`Импорт товаров завершен: ${successCount} успешно, ${errorCount} с ошибками`);
}

export async function batchInsertCategories(categories: any[], feedId: string) {
  const BATCH_SIZE = 1000;
  console.log(`Начинаем импорт ${categories.length} категорий в фид ${feedId}`);
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < categories.length; i += BATCH_SIZE) {
    try {
      const currentBatch = categories.slice(i, i + BATCH_SIZE).map(c => {
        // Получаем оригинальный ID из категории (будет сохранён в поле original_id)
        const originalId = c.id;
        
        // Создаем новый объект для вставки
        return { 
          ...toSnakeCase(c), 
          feed_id: feedId, 
          original_id: originalId, 
          id: crypto.randomUUID() // Генерируем новый UUID для поля id
        };
      });
      
      // Сначала пробуем вставку с ON CONFLICT
      try {
        const { data, error } = await supabase
          .from('categories')
          .upsert(currentBatch, { 
            onConflict: 'feed_id,original_id',
            ignoreDuplicates: false 
          });
          
        if (error) {
          // Если ошибка связана с отсутствием ограничения unique, используем обычный insert
          if (error.code === '42P10') {
            console.warn('Ограничение unique_feed_original_id не найдено, используем обычный insert');
            const { error: insertError } = await supabase
              .from('categories')
              .insert(currentBatch);
            
            if (insertError) {
              throw insertError;
            }
          } else {
            throw error;
          }
        }
      } catch (upsertError: any) {
        // Если ошибка связана с отсутствием ограничения unique, используем обычный insert
        if (upsertError.code === '42P10') {
          console.warn('Ограничение unique_feed_original_id не найдено, используем обычный insert');
          const { error: insertError } = await supabase
            .from('categories')
            .insert(currentBatch);
          
          if (insertError) {
            throw insertError;
          }
        } else {
          throw upsertError;
        }
      }
      
      console.log(`Успешно импортировано ${currentBatch.length} категорий (батч ${i / BATCH_SIZE + 1})`);
      successCount += currentBatch.length;
    } catch (err) {
      console.error(`Исключение при импорте батча категорий (${i} - ${i + BATCH_SIZE}):`, err);
      errorCount += BATCH_SIZE;
    }
  }
  
  console.log(`Импорт категорий завершен: ${successCount} успешно, ${errorCount} с ошибками`);
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

// --- FEED AI SETTINGS ---
export async function getFeedAiSettings(feedId: string) {
  try {
    console.log('Получение настроек AI для фида:', feedId);
    
    const { data, error } = await supabase
      .from('feed_ai_settings')
      .select('*')
      .eq('feed_id', feedId)
      .maybeSingle();
    
    if (error) {
      console.error('Ошибка при получении настроек AI для фида:', error);
      throw error;
    }
    
    if (!data) {
      console.log('Настройки AI не найдены для фида:', feedId);
      return null;
    }
    
    console.log('Получены настройки AI для фида:', data);
    
    // Преобразуем snake_case в camelCase
    const result = {
      id: data.id,
      feedId: data.feed_id,
      namePrompt: data.name_prompt || '',
      descriptionPrompt: data.description_prompt || '',
      titlePrompt: data.title_prompt || '',
      summaryPrompt: data.summary_prompt || '',
      language: data.language || 'ru',
      tone: data.tone || 'профессиональный',
      maxTokens: data.max_tokens || 150
    };
    
    return result;
  } catch (error) {
    console.error('Исключение при получении настроек AI для фида:', error);
    throw error;
  }
}

export async function upsertFeedAiSettings(feedId: string, settings: any) {
  try {
    console.log('Сохранение настроек AI для фида:', feedId, settings);
    
    // Проверяем, существуют ли уже настройки для этого фида
    const { data: existingSettings } = await supabase
      .from('feed_ai_settings')
      .select('id')
      .eq('feed_id', feedId)
      .maybeSingle();
    
    // Подготавливаем данные в snake_case для сохранения
    const payload = {
      id: existingSettings?.id || crypto.randomUUID(),
      feed_id: feedId,
      name_prompt: settings.namePrompt || '',
      description_prompt: settings.descriptionPrompt || '',
      title_prompt: settings.titlePrompt || '',
      summary_prompt: settings.summaryPrompt || '',
      language: settings.language || 'ru',
      tone: settings.tone || 'профессиональный',
      max_tokens: settings.maxTokens || 150
    };
    
    console.log('Сохраняем настройки AI для фида с данными:', payload);
    
    const { data, error } = await supabase
      .from('feed_ai_settings')
      .upsert([payload], { onConflict: 'id' })
      .select()
      .single();
    
    if (error) {
      console.error('Ошибка при сохранении настроек AI для фида:', error);
      throw error;
    }
    
    console.log('Настройки AI для фида успешно сохранены:', data);
    
    // Преобразуем обратно в camelCase
    return {
      id: data.id,
      feedId: data.feed_id,
      namePrompt: data.name_prompt || '',
      descriptionPrompt: data.description_prompt || '',
      titlePrompt: data.title_prompt || '',
      summaryPrompt: data.summary_prompt || '',
      language: data.language || 'ru',
      tone: data.tone || 'профессиональный',
      maxTokens: data.max_tokens || 150
    };
  } catch (error) {
    console.error('Исключение при сохранении настроек AI для фида:', error);
    throw error;
  }
} 