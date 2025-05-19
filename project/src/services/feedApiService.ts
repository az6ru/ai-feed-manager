import { Feed } from '../types/feed';
import { generateYmlFromFeed } from './ymlParser';

/**
 * URL API-сервера фидов
 */
const FEED_API_URL = import.meta.env.VITE_FEED_API_URL || 'http://localhost:3040';

/**
 * Публикует XML-фид на API-сервере
 * 
 * @param feed Фид для публикации
 * @returns Ссылка на опубликованный фид
 */
export async function publishFeed(feed: Feed): Promise<string> {
  try {
    // Генерируем XML из фида
    const xmlContent = generateYmlFromFeed(feed);
    
    // Отправляем XML на сервер
    const response = await fetch(`${FEED_API_URL}/feed/${feed.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xmlContent,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка при публикации фида: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    // Возвращаем URL для доступа к фиду
    return result.url;
  } catch (error) {
    console.error('Ошибка публикации фида:', error);
    throw new Error(`Не удалось опубликовать фид: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Обновляет существующий опубликованный фид
 * 
 * @param feed Фид с обновленными данными
 * @returns Ссылка на обновленный фид
 */
export async function updatePublishedFeed(feed: Feed): Promise<string> {
  try {
    // Генерируем XML из фида
    const xmlContent = generateYmlFromFeed(feed);
    
    // Отправляем XML на сервер повторно с тем же URL что и при публикации
    // Используем тот же URL и метод POST, но добавляем query-параметр ?update=true
    const response = await fetch(`${FEED_API_URL}/feed/${feed.id}?update=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xmlContent,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка при обновлении фида: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    // Возвращаем URL для доступа к фиду
    return result.url;
  } catch (error) {
    console.error('Ошибка обновления фида:', error);
    throw new Error(`Не удалось обновить фид: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Удаляет опубликованный фид с сервера
 * 
 * @param feedId ID фида для удаления
 * @returns true, если фид успешно удален
 */
export async function deletePublishedFeed(feedId: string): Promise<boolean> {
  try {
    console.log(`Отправка запроса на удаление фида: ${FEED_API_URL}/feed/${feedId}`);
    
    // Отправляем запрос на удаление файла фида с сервера
    const response = await fetch(`${FEED_API_URL}/feed/${feedId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ошибка при удалении фида (статус ${response.status}):`, errorText);
      throw new Error(`Ошибка при удалении фида: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Ответ от API при удалении фида:', result);
    
    if (!result.success) {
      throw new Error(`Ошибка при удалении фида: ${result.message || 'Неизвестная ошибка'}`);
    }
    
    console.log('Фид успешно удален с сервера');
    return true;
  } catch (error) {
    console.error('Ошибка удаления фида:', error);
    throw new Error(`Не удалось удалить фид: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Проверяет доступность API-сервера фидов
 * 
 * @returns true, если сервер доступен
 */
export async function isFeedApiAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${FEED_API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    console.warn('API-сервер фидов недоступен:', error);
    return false;
  }
}

/**
 * Получает URL для доступа к фиду
 * 
 * @param feedId ID фида
 * @returns URL для доступа к фиду
 */
export function getFeedUrl(feedId: string): string {
  return `${FEED_API_URL}/feed/${feedId}`;
}

/**
 * Проверяет, опубликован ли фид на сервере, и возвращает URL для доступа к нему.
 * 
 * @param feedId ID фида
 * @returns URL для доступа к фиду или null, если фид не опубликован
 */
export async function getFeedUrlIfPublished(feedId: string): Promise<string | null> {
  try {
    // Проверяем доступность сервера
    const isApiAvailable = await isFeedApiAvailable();
    if (!isApiAvailable) {
      console.warn('API-сервер фидов недоступен, невозможно проверить статус публикации');
      return null;
    }
    
    // Проверяем наличие фида на сервере
    const response = await fetch(`${FEED_API_URL}/feed/${feedId}`, {
      method: 'HEAD',
      headers: {
        'Accept': 'application/xml',
      },
    });
    
    // Если фид найден, возвращаем URL
    if (response.ok) {
      return getFeedUrl(feedId);
    }
    
    return null;
  } catch (error) {
    console.warn('Ошибка при проверке статуса публикации фида:', error);
    return null;
  }
} 