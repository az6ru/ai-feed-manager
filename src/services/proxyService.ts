import axios from 'axios';

/**
 * Сервис для обхода CORS-ограничений при получении внешних фидов
 */

// URL для локального или удаленного прокси-сервера
const PROXY_SERVER_URL = import.meta.env.VITE_PROXY_SERVER_URL || 'http://localhost:3030/proxy';

/**
 * Получает содержимое фида по URL через прокси-сервер
 * 
 * @param url URL фида для получения
 * @returns Содержимое фида в виде строки
 */
export async function fetchViaProxy(url: string): Promise<string> {
  try {
    // Формируем URL для простого прокси-сервера
    // PROXY_SERVER_URL уже содержит параметр url=
    const proxyUrl = `${PROXY_SERVER_URL}${encodeURIComponent(url)}`;
    
    console.log('Fetching via proxy server:', proxyUrl);
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, application/json, text/plain, */*',
        'Origin': window.location.origin,
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка прокси-сервера: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.text();
    
    console.log('Proxy response received:', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      dataSize: data.length
    });
    
    return data;
    
  } catch (error: any) {
    console.error('Proxy fetch error:', error);
    
    // Улучшенное сообщение об ошибке
    if (error.response) {
      throw new Error(`Ошибка на сервере YML фида: ${error.response.status} ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error(`Не удалось получить ответ от прокси-сервера: ${error.message}`);
    } else {
      throw new Error(`Ошибка при получении через прокси: ${error.message}`);
    }
  }
}

/**
 * Проверяет доступность прокси-сервера
 * 
 * @returns true, если прокси-сервер доступен
 */
export async function isProxyAvailable(): Promise<boolean> {
  try {
    console.log('Checking proxy server availability at:', PROXY_SERVER_URL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Используем новый endpoint для проверки доступности
    const healthCheckUrl = `http://localhost:3035/health`;
    
    const response = await fetch(healthCheckUrl, { 
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log('Proxy server is available');
      return true;
    } else {
      console.warn('Proxy server returned non-OK status:', response.status);
      return false;
    }
  } catch (error) {
    console.warn('Proxy server is not available:', error);
    return false;
  }
}

/**
 * Загружает XML фид напрямую или через прокси
 * 
 * @param url URL фида
 * @returns Содержимое фида в виде строки
 */
export async function fetchFeedContent(url: string): Promise<string> {
  // Пробуем использовать прокси сначала
  const proxyAvailable = await isProxyAvailable();
  
  if (proxyAvailable) {
    try {
      return await fetchViaProxy(url);
    } catch (error) {
      console.warn('Failed to fetch via proxy, trying direct fetch:', error);
      // Если прокси не сработал, пробуем прямой запрос
    }
  }
  
  // Прямой запрос как запасной вариант
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/xml, text/xml, application/json, text/plain, */*',
        'Cache-Control': 'no-cache'
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error: any) {
    // Если и прямой запрос не сработал
    throw new Error(`Не удалось получить фид: ${error.message}`);
  }
} 