import { XMLParser } from 'fast-xml-parser';
import { Feed, Product, Category, FeedMetadata } from '../types/feed';
import { supabase } from './supabaseClient';

/**
 * Парсит YML-фид из XML строки
 * Поддерживает различные форматы YML и обрабатывает ошибки структуры
 */
export async function parseFeedFromXml(xmlContent: string, feedName: string, sourceUrl?: string): Promise<Feed> {
  // Проверяем, начинается ли XML с правильного заголовка
  if (!xmlContent.trim().startsWith('<?xml') && !xmlContent.trim().startsWith('<yml_catalog')) {
    // Пробуем восстановить заголовок
    console.log('XML не содержит правильного заголовка, пытаемся восстановить...');
    // Ищем первый валидный XML тег
    const tagMatch = xmlContent.match(/<[a-zA-Z_][a-zA-Z0-9:_.-]*[^>]*>/);
    if (tagMatch) {
      console.log(`Найден первый тег: ${tagMatch[0]}`);
      const rootTag = tagMatch[0].replace(/<([a-zA-Z_][a-zA-Z0-9:_.-]*)[^>]*>/, '$1');
      console.log(`Корневой тег: ${rootTag}`);
      
      // Добавляем XML заголовок и оборачиваем в yml_catalog если необходимо
      if (rootTag !== 'yml_catalog') {
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<yml_catalog date="${new Date().toISOString()}">\n${xmlContent}\n</yml_catalog>`;
      } else {
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;
      }
      console.log('XML восстановлен с добавлением заголовка');
    } else {
      console.error('Не удалось найти валидный XML тег');
    }
  }
  
  // Логируем начало XML для отладки
  console.log("XML начало (первые 200 символов):", xmlContent.substring(0, 200));
  console.log("XML конец (последние 200 символов):", xmlContent.substring(xmlContent.length - 200));
  
  // Проверяем, закрыты ли все основные теги
  const openYmlCatalog = (xmlContent.match(/<yml_catalog/g) || []).length;
  const closeYmlCatalog = (xmlContent.match(/<\/yml_catalog>/g) || []).length;
  
  if (openYmlCatalog > closeYmlCatalog) {
    console.log('Обнаружены незакрытые теги yml_catalog, пытаемся исправить...');
    xmlContent = xmlContent + '</yml_catalog>'.repeat(openYmlCatalog - closeYmlCatalog);
  }
  
  // Создаем парсер с расширенными опциями
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['offer', 'category', 'param', 'picture'].includes(name),
    parseAttributeValue: true,
    trimValues: true,
    cdataPropName: '__cdata',
    parseTagValue: true,
    allowBooleanAttributes: true,
    // Добавляем функцию-обработчик тегов для предварительной обработки значений
    tagValueProcessor: (tagName, tagValue) => {
      // Особая обработка для значения "00" в тегах param
      if (tagName === 'param' && tagValue === '00') {
        console.log('Обнаружено значение 00 в теге param, сохраняем как строку');
        return '00';
      }
      
      // Особая обработка для других проблемных значений
      if (tagValue === '0' || (typeof tagValue === 'number' && tagValue === 0)) {
        return '0';
      }
      
      return tagValue;
    }
  });
  
  try {
    // Парсим XML
    const result = parser.parse(xmlContent);
    
    console.log("Parsed XML structure keys:", Object.keys(result));
    
    // Определяем структуру документа
    let shop = null;
    let rootElement = '';
    
    // Поддержка различных структур yml_catalog
    if (result.yml_catalog?.shop) {
      shop = result.yml_catalog.shop;
      rootElement = 'yml_catalog';
      console.log("Найдена стандартная структура: yml_catalog -> shop");
    } else if (result.shop) {
      shop = result.shop;
      rootElement = 'document';
      console.log("Найдена структура без yml_catalog: shop (напрямую)");
    } else {
      // Пытаемся найти shop на первом уровне структуры
      const keys = Object.keys(result);
      for (const key of keys) {
        if (result[key]?.shop) {
          shop = result[key].shop;
          rootElement = key;
          console.log(`Найдена нестандартная структура: ${key} -> shop`);
          break;
        }
      }
      
      // Если shop не найден, проверяем, есть ли корневой элемент с товарами
      if (!shop) {
        for (const key of keys) {
          const obj = result[key];
          if (Array.isArray(obj) && obj.length > 0 && 
              obj[0] && typeof obj[0] === 'object' && 
              (obj[0].name || obj[0].title || obj[0].price)) {
            // Найдены товары без shop структуры
            shop = { offers: { offer: obj } };
            rootElement = key;
            console.log(`Найдены товары без shop структуры в элементе: ${key}`);
            break;
          } else if (obj?.offers || obj?.items || obj?.products) {
            shop = obj;
            rootElement = key;
            console.log(`Найден элемент с товарами без shop структуры: ${key}`);
            break;
          }
        }
      }
    }
    
    if (!shop) {
      console.error("Структура XML не распознана:", JSON.stringify(result, null, 2).substring(0, 500));
      throw new Error('Неверный формат YML: элемент shop не найден и невозможно определить структуру товаров');
    }
    
    // Генерируем метаданные с запасными вариантами
    const metadata: FeedMetadata = {
      name: shop.name || shop.title || feedName || 'Неизвестный магазин',
      company: shop.company || shop.organization || '',
      url: sourceUrl || '',
      shopUrl: shop.url || shop.site || '',
      date: result.yml_catalog?.['@_date'] || 
            result[rootElement]?.['@_date'] || 
            new Date().toISOString(),
    };
    
    console.log('Метаданные:', metadata);
    console.log('Парсинг категорий...');
    
    // Создаем категории
    let categories: Category[] = extractCategories(shop);
    console.log(`Распознано ${categories.length} категорий`);
    
    // Создаем товары
    let products: Product[] = extractProducts(shop);
    console.log(`Распознано ${products.length} товаров`);
    
    // Если нет категорий, но есть товары с category_id
    if (categories.length === 0 && products.length > 0) {
      console.log('Генерируем категории из товаров...');
      const categoryIds = new Set<string>();
      products.forEach(product => {
        if (product.categoryId) {
          categoryIds.add(product.categoryId);
        }
      });
      
      categories = Array.from(categoryIds).map(id => ({
        id,
        name: `Категория ${id}`,
      }));
      
      console.log(`Сгенерировано ${categories.length} категорий из товаров`);
    }
    
    // Создаем базовый объект Feed
    const feed: Feed = {
      id: getFeedId(sourceUrl, feedName),
      name: feedName,
      createdAt: new Date().toISOString(),
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      version: '1.0',
      metadata,
      categories,
      products,
      source: 'xml',
    };
    
    return feed;
  } catch (error: any) {
    console.error('Ошибка при парсинге XML:', error);
    
    // Попытка восстановления для обработки битых XML
    if (error.message && error.message.includes('Invalid XML')) {
      console.log('Пытаемся восстановить битый XML...');
      
      // Примитивное восстановление - удаление проблемных символов
      const cleanXml = xmlContent
        .replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, '') // Удаление невалидных XML символов
        .replace(/&#\d+;/g, ' '); // Замена HTML entity на пробелы
      
      // Рекурсивно вызываем с очищенным XML
      return parseFeedFromXml(cleanXml, feedName, sourceUrl);
    }
    
    throw new Error(`Не удалось распарсить XML: ${error.message}`);
  }
}

/**
 * Извлекает категории из различных структур shop
 */
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function extractCategories(shop: any): Category[] {
  console.log('Извлечение категорий...');
  let rawCategories: any[] = [];
  if (shop.categories?.category) {
    rawCategories = shop.categories.category;
    console.log(`Найдено ${rawCategories.length} категорий в shop.categories.category`);
  } else if (shop.categories && Array.isArray(shop.categories)) {
    rawCategories = shop.categories;
    console.log(`Найдено ${rawCategories.length} категорий в shop.categories (массив)`);
  } else if (shop.categories && typeof shop.categories === 'object') {
    const categoryKeys = Object.keys(shop.categories).filter(key =>
      Array.isArray(shop.categories[key]) ||
      key.toLowerCase().includes('category') ||
      key.toLowerCase().includes('категор')
    );
    if (categoryKeys.length > 0) {
      const key = categoryKeys[0];
      console.log(`Найдены потенциальные категории в shop.categories.${key}`);
      rawCategories = Array.isArray(shop.categories[key])
        ? shop.categories[key]
        : [shop.categories[key]];
    } else {
      rawCategories = [shop.categories];
    }
  } else if (shop.category) {
    rawCategories = Array.isArray(shop.category) ? shop.category : [shop.category];
    console.log(`Найдено ${rawCategories.length} категорий напрямую в shop.category`);
  }
  if (rawCategories.length === 0) {
    console.log('Категории не найдены');
    return [];
  }
  return rawCategories
    .filter(Boolean)
    .map((cat: any) => {
      let id = cat['@_id'] || cat.id || generateId();
      if (!isValidUUID(id)) id = generateId();
      let name = '';
      if (cat['#text']) name = cat['#text'];
      else if (cat._) name = cat._;
      else if (cat.name) name = cat.name;
      else if (cat.title) name = cat.title;
      else if (cat.text) name = cat.text;
      else name = `Категория ${id}`;
      let parentId = undefined;
      if (cat['@_parentId']) parentId = cat['@_parentId'];
      else if (cat.parentId) parentId = cat.parentId;
      else if (cat.parent_id) parentId = cat.parent_id;
      if (parentId && !isValidUUID(parentId)) parentId = undefined;
      return {
        id: String(id),
        name: String(name),
        parentId: parentId ? String(parentId) : undefined,
      };
    });
}

/**
 * Извлекает товары из различных структур shop
 */
function extractProducts(shop: any): Product[] {
  console.log('Извлечение товаров...');
  let rawProducts: any[] = [];
  if (shop.offers?.offer) {
    rawProducts = shop.offers.offer;
  } else if (shop.offers) {
    rawProducts = Array.isArray(shop.offers) ? shop.offers : [shop.offers];
  } else if (shop.items?.item) {
    rawProducts = shop.items.item;
  } else if (shop.products?.product) {
    rawProducts = shop.products.product;
  } else {
    for (const key in shop) {
      if (Array.isArray(shop[key]) && shop[key].length > 0 &&
          shop[key][0] && typeof shop[key][0] === 'object' &&
          (shop[key][0].price || shop[key][0].name || shop[key][0].title)) {
        rawProducts = shop[key];
        console.log(`Найдены товары в поле ${key}`);
        break;
      }
    }
  }
  if (rawProducts.length === 0) {
    console.log('Товары не найдены в стандартных местах, выполняем глубокий поиск...');
    const findProducts = (obj: any, path: string = ''): any[] | null => {
      if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
        const sample = obj[0];
        if (sample.price || sample.name || sample.title || sample.id) {
          console.log(`Найден возможный массив товаров по пути ${path}, ${obj.length} элементов`);
          return obj;
        }
      }
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (obj[key] && typeof obj[key] === 'object') {
            const result = findProducts(obj[key], `${path}.${key}`);
            if (result) return result;
          }
        }
      }
      return null;
    };
    const foundProducts = findProducts(shop);
    if (foundProducts) {
      rawProducts = foundProducts;
    }
  }
  if (rawProducts.length === 0) {
    console.log('Товары не найдены');
    return [];
  }
  console.log(`Найдено ${rawProducts.length} товаров`);
  if (rawProducts.length > 0) {
    console.log('Пример товара:', JSON.stringify(rawProducts[0]).substring(0, 500));
  }
  
  // Создаем Set для проверки уникальности externalId
  const usedExternalIds = new Set<string>();
  
  return rawProducts.map((product: any, index: number) => {
    let id = generateId(); // внутренний UUID
    
    // Получаем externalId или генерируем новый, если отсутствует
    let externalId = product['@_id'] || product.id || '';
    
    // Если externalId пустой, генерируем его из индекса и имени продукта
    if (!externalId) {
      const productName = product.name || product.n || product.title || 'unknown';
      externalId = `ext_${index}_${productName.substring(0, 20).replace(/\s+/g, '_')}`;
      console.log(`Сгенерирован externalId для товара без ID: ${externalId}`);
    }
    
    // Проверяем, был ли такой externalId уже использован в текущем импорте
    // Если да, добавляем случайный суффикс для обеспечения уникальности
    let uniqueExternalId = externalId;
    let counter = 1;
    while (usedExternalIds.has(uniqueExternalId)) {
      uniqueExternalId = `${externalId}_${counter}`;
      counter++;
    }
    
    // Добавляем ID в набор использованных
    usedExternalIds.add(uniqueExternalId);
    
    // Сохраняем финальный externalId
    externalId = uniqueExternalId;
    product.externalId = externalId;
    
    // Получаем categoryId (это будет использоваться как original_id для связи с категориями)
    let categoryId = product.categoryId || product.category_id || '';
    
    let pictures: string[] = [];
    if (product.picture) {
      if (Array.isArray(product.picture)) {
        pictures = product.picture.filter(Boolean);
      } else if (typeof product.picture === 'string') {
        pictures = [product.picture];
      }
    } else if (product.pictures && Array.isArray(product.pictures)) {
      pictures = product.pictures.filter(Boolean);
    } else if (product.images && Array.isArray(product.images)) {
      pictures = product.images.filter(Boolean);
    } else if (product.image) {
      pictures = [product.image].filter(Boolean);
    }
    let attributes: any[] = [];
    if (product.param) {
      if (Array.isArray(product.param)) {
        product.param.forEach((p: any) => {
          if (p && p['#text']) {
            p.originalText = p['#text'];
          }
        });
      } else if (product.param['#text']) {
        product.param.originalText = product.param['#text'];
      }
      attributes = Array.isArray(product.param)
        ? product.param.map(normalizeParam)
        : [normalizeParam(product.param)];
    } else if (product.params) {
      if (Array.isArray(product.params)) {
        product.params.forEach((p: any) => {
          if (p && p['#text']) {
            p.originalText = p['#text'];
          }
        });
      } else if (product.params['#text']) {
        product.params.originalText = product.params['#text'];
      }
      attributes = Array.isArray(product.params)
        ? product.params.map(normalizeParam)
        : [normalizeParam(product.params)];
    } else if (product.attributes) {
      if (Array.isArray(product.attributes)) {
        product.attributes.forEach((p: any) => {
          if (p && p['#text']) {
            p.originalText = p['#text'];
          }
        });
      } else if (product.attributes['#text']) {
        product.attributes.originalText = product.attributes['#text'];
      }
      attributes = Array.isArray(product.attributes)
        ? product.attributes.map(normalizeParam)
        : [normalizeParam(product.attributes)];
    }
    return {
      id,
      externalId,
      name: product.name || product.n || product.title || 'Unknown Product',
      description: normalizeDescription(product.description || product.desc || ''),
      price: parseFloat(product.price) || 0,
      oldPrice: parseNumberField(product.oldprice || product.old_price),
      currency: product.currencyId || product.currency || 'RUB',
      categoryId: categoryId, // Это будет использоваться как original_id категории
      url: product.url || '',
      pictures,
      available: normalizeAvailableStatus(product),
      attributes,
      vendor: product.vendor || product.brand || '',
      vendorCode: product.vendorCode || product.vendor_code || product.article || '',
      includeInExport: true,
      rawOffer: product
    };
  });
}

// Вспомогательные функции для нормализации данных
function normalizeParam(param: any): any {
  const paramName = param['@_name'] || 'parameter';
  let paramValue = '';
  if (typeof param === 'string') {
    paramValue = param;
  } else if (param['#text'] !== undefined) {
    paramValue = String(param['#text']);
  } else if (param._ !== undefined) {
    paramValue = String(param._);
  } else {
    // fallback: если вдруг объект, берём первое строковое/числовое значение
    const first = Object.values(param).find(v => typeof v === 'string' || typeof v === 'number');
    paramValue = first !== undefined ? String(first) : '';
  }
  return { name: paramName, value: paramValue };
}

function parseNumberField(value: any): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

function normalizeAvailableStatus(offer: any): boolean {
  // Проверяем различные варианты записи статуса доступности
  if (offer['@_available'] !== undefined) {
    if (typeof offer['@_available'] === 'string') {
      return offer['@_available'] === 'true' || offer['@_available'] === 'yes' || offer['@_available'] === '1';
    }
    return Boolean(offer['@_available']);
  }
  
  if (offer.available !== undefined) {
    if (typeof offer.available === 'string') {
      return offer.available === 'true' || offer.available === 'yes' || offer.available === '1';
    }
    return Boolean(offer.available);
  }
  
  if (offer.stock !== undefined) {
    // Если есть поле stock, и оно число > 0 или 'true'
    if (typeof offer.stock === 'number') {
      return offer.stock > 0;
    }
    if (typeof offer.stock === 'string') {
      return offer.stock === 'true' || offer.stock === 'yes' || offer.stock === '1' || parseInt(offer.stock, 10) > 0;
    }
    return Boolean(offer.stock);
  }
  
  // Проверка атрибута type="vendor.model"
  if (offer['@_type'] === 'vendor.model') {
    return true; // Обычно такие товары доступны
  }
  
  // Проверка наличия цены
  if (offer.price && parseFloat(offer.price) > 0) {
    return true; // Если у товара указана цена, скорее всего он доступен
  }
  
  // По умолчанию считаем товар доступным
  return true;
}

// Добавим функцию для безопасного форматирования значений атрибутов
function safeFormatAttributeValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return String(value);
}

export function generateYmlFromFeed(feed: Feed): string {
  // Проверяем, что shopUrl магазина указан
  if (!feed.metadata.shopUrl) {
    throw new Error('В настройках магазина не указан URL сайта (shopUrl) — это обязательное поле!');
  }
  const shopUrl = feed.metadata.shopUrl;
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<yml_catalog date="${new Date().toISOString()}">\n`;
  xml += '  <shop>\n';
  xml += `    <name>${escapeXml(feed.metadata.name)}</name>\n`;
  xml += `    <company>${escapeXml(feed.metadata.company)}</company>\n`;
  xml += `    <url>${escapeXml(shopUrl)}</url>\n`;
  
  // Categories
  xml += '    <categories>\n';
  feed.categories.forEach(category => {
    const parentAttr = category.parentId ? ` parentId="${category.parentId}"` : '';
    xml += `      <category id="${category.id}"${parentAttr}>${escapeXml(category.name)}</category>\n`;
  });
  xml += '    </categories>\n';
  
  // Offers (products)
  xml += '    <offers>\n';
  
  // Фильтруем только те товары, которые должны быть включены в выгрузку
  const productsToExport = feed.products.filter(product => 
    // Если поле includeInExport явно задано как false, исключаем товар
    product.includeInExport !== false
  );
  
  console.log(`Экспорт товаров: ${productsToExport.length} из ${feed.products.length} включены в выгрузку`);
  
  productsToExport.forEach(product => {
    xml += `      <offer id="${product.id}" available="${product.available}">\n`;
    
    // Используем сгенерированное имя, если оно есть
    const productName = product.generatedName || product.name;
    xml += `        <name>${escapeXml(productName)}</name>\n`;
    
    // Используем сгенерированное описание, если оно есть
    const description = product.generatedDescription || product.description;
    if (description) {
      xml += `        <description>${escapeXml(description)}</description>\n`;
    }
    
    xml += `        <price>${product.price}</price>\n`;
    if (product.oldPrice) {
      xml += `        <oldprice>${product.oldPrice}</oldprice>\n`;
    }
    xml += `        <currencyId>${product.currency}</currencyId>\n`;
    xml += `        <categoryId>${product.categoryId}</categoryId>\n`;
    
    // Используем сгенерированный URL, если URL не задан
    const productUrl = product.url || product.generatedUrl;
    if (productUrl) {
      xml += `        <url>${escapeXml(productUrl)}</url>\n`;
    }
    
    if (product.pictures && product.pictures.length > 0) {
      product.pictures.forEach(pic => {
        if (pic) {
          xml += `        <picture>${escapeXml(pic)}</picture>\n`;
        }
      });
    }
    
    if (product.vendor) {
      xml += `        <vendor>${escapeXml(product.vendor)}</vendor>\n`;
    }
    
    if (product.vendorCode) {
      xml += `        <vendorCode>${escapeXml(product.vendorCode)}</vendorCode>\n`;
    }
    
    // Product attributes
    product.attributes.forEach(attr => {
      // Используем безопасное форматирование для значений атрибутов
      const safeValue = safeFormatAttributeValue(attr.value);
      xml += `        <param name="${escapeXml(attr.name)}">${escapeXml(safeValue)}</param>\n`;
    });
    
    xml += '      </offer>\n';
  });
  xml += '    </offers>\n';
  
  xml += '  </shop>\n';
  xml += '</yml_catalog>';
  
  return xml;
}

function escapeXml(unsafe: any): string {
  if (unsafe === null || unsafe === undefined) return '';
  
  // Преобразуем нестроковые значения в строки
  if (typeof unsafe !== 'string') {
    // Обработка объектов
    if (typeof unsafe === 'object') {
      try {
        // Пытаемся извлечь значение из объекта
        if (unsafe.value !== undefined) return escapeXml(String(unsafe.value));
        if (unsafe.text !== undefined) return escapeXml(String(unsafe.text));
        if (unsafe.name !== undefined) return escapeXml(String(unsafe.name));
        
        // Пытаемся преобразовать объект в JSON-строку
        return escapeXml(JSON.stringify(unsafe));
      } catch (e) {
        console.warn('Ошибка при преобразовании объекта в XML:', e);
        return '';
      }
    }
    
    // Для других типов (число, булево и т.д.)
    unsafe = String(unsafe);
  }
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateId(): string {
  // Теперь всегда возвращаем UUID v4 для совместимости с Supabase
  return uuidv4();
}

// Добавим функцию для обработки больших файлов
export async function processLargeYmlFile(
  xmlContent: string, 
  feedName: string, 
  batchSize: number = 1000,
  onProgress?: (processed: number, total: number) => void,
  sourceUrl?: string
): Promise<Feed> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => ['offer', 'category', 'param', 'picture'].includes(name),
    // Добавляем функцию-обработчик тегов для предварительной обработки значений
    tagValueProcessor: (tagName, tagValue) => {
      // Особая обработка для значения "00" в тегах param
      if (tagName === 'param' && tagValue === '00') {
        console.log('Обнаружено значение 00 в теге param при обработке большого файла, сохраняем как строку');
        return '00';
      }
      
      // Особая обработка для других проблемных значений
      if (tagValue === '0' || (typeof tagValue === 'number' && tagValue === 0)) {
        return '0';
      }
      
      return tagValue;
    }
  });
  
  try {
    console.log('Parsing large XML file...');
    const result = parser.parse(xmlContent);
    
    // Поиск магазина как в стандартном парсере
    let shop;
    if (result.yml_catalog?.shop) {
      shop = result.yml_catalog.shop;
    } else if (result.shop) {
      shop = result.shop;
    } else {
      const keys = Object.keys(result);
      for (const key of keys) {
        if (result[key]?.shop) {
          shop = result[key].shop;
          break;
        }
      }
    }
    
    if (!shop) {
      throw new Error('Invalid YML format: No shop element found');
    }
    
    // Парсинг метаданных и категорий
    const metadata: FeedMetadata = {
      name: shop.name || shop.n || 'Unknown Shop',
      company: shop.company || '',
      url: sourceUrl || '',
      shopUrl: shop.url || shop.site || '',
      date: result.yml_catalog?.['@_date'] || 
            result['@_date'] || 
            new Date().toISOString(),
    };
    
    console.log('Parsing categories...');
    let rawCategories = [];
    if (shop.categories?.category) {
      rawCategories = shop.categories.category;
    } else if (shop.categories) {
      rawCategories = Array.isArray(shop.categories) ? shop.categories : [shop.categories];
    }
    
    const categories: Category[] = rawCategories.map((cat: any) => {
      if (typeof cat === 'string') {
        return {
          id: generateId(),
          name: cat,
        };
      }
      
      return {
        id: cat['@_id'] || String(cat) || generateId(),
        name: cat['#text'] || cat._ || cat.name || 'Unknown Category',
        parentId: cat['@_parentId'] || cat.parentId || undefined,
      };
    });
    
    console.log(`Parsed ${categories.length} categories`);
    
    // Получаем список всех офферов
    let rawOffers: any[] = [];
    if (shop.offers?.offer) {
      rawOffers = shop.offers.offer;
    } else if (shop.offers) {
      rawOffers = Array.isArray(shop.offers) ? shop.offers : [shop.offers];
    } else if (shop.items?.item) {
      rawOffers = Array.isArray(shop.items.item) ? shop.items.item : [shop.items.item];
    }
    
    const totalOffers = rawOffers.length;
    console.log(`Total offers to process: ${totalOffers}`);
    
    // Создаем базовый объект Feed
    const feed: Feed = {
      id: getFeedId(sourceUrl, feedName),
      name: feedName,
      createdAt: new Date().toISOString(),
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      version: '1.0',
      metadata,
      categories,
      products: [],
      source: 'xml',
    };
    
    // Обрабатываем товары батчами
    const batches = Math.ceil(totalOffers / batchSize);
    
    // Создаем Set для проверки уникальности externalId
    const usedExternalIds = new Set<string>();
    
    for (let i = 0; i < batches; i++) {
      const startIndex = i * batchSize;
      const endIndex = Math.min(startIndex + batchSize, totalOffers);
      
      console.log(`Processing batch ${i + 1}/${batches} (items ${startIndex + 1}-${endIndex})`);
      
      const batchOffers = rawOffers.slice(startIndex, endIndex);
      const batchProducts = batchOffers.map((offer: any, index: number) => {
        let attributes: any[] = [];
        if (offer.param) {
          attributes = Array.isArray(offer.param)
            ? offer.param.map(normalizeParam)
            : [normalizeParam(offer.param)];
        }
        
        // Extract pictures
        let pictures: string[] = [];
        if (offer.picture) {
          if (Array.isArray(offer.picture)) {
            pictures = offer.picture.map((p: any) => p['#text'] || p._ || String(p)).filter(Boolean);
          } else {
            const pic = offer.picture['#text'] || offer.picture._ || String(offer.picture);
            if (pic) pictures = [pic];
          }
        }
        
        // Получаем externalId или генерируем новый, если отсутствует
        const globalIndex = startIndex + index; // Глобальный индекс товара
        let externalId = offer['@_id'] || offer.id || '';
        
        // Если externalId пустой, генерируем его из индекса и имени продукта
        if (!externalId) {
          const productName = offer.name || offer.n || offer.title || 'unknown';
          externalId = `ext_${globalIndex}_${productName.substring(0, 20).replace(/\s+/g, '_')}`;
          console.log(`Сгенерирован externalId для товара без ID: ${externalId}`);
        }
        
        // Проверяем, был ли такой externalId уже использован в текущем импорте
        // Если да, добавляем случайный суффикс для обеспечения уникальности
        let uniqueExternalId = externalId;
        let counter = 1;
        while (usedExternalIds.has(uniqueExternalId)) {
          uniqueExternalId = `${externalId}_${counter}`;
          counter++;
        }
        
        // Добавляем ID в набор использованных
        usedExternalIds.add(uniqueExternalId);
        
        // Сохраняем финальный externalId
        externalId = uniqueExternalId;
        
        return {
          id: generateId(), // внутренний UUID
          externalId, // внешний id из фида (гарантированно уникальный)
          name: offer.name || offer.n || offer.title || 'Unknown Product',
          description: normalizeDescription(offer.description || offer.desc || ''),
          price: parseFloat(offer.price) || 0,
          oldPrice: parseNumberField(offer.oldprice || offer.old_price),
          currency: offer.currencyId || offer.currency || 'RUB',
          categoryId: offer.categoryId || offer.category_id || '',
          url: offer.url || '',
          pictures: normalizePicture(offer.picture),
          vendor: offer.vendor || offer.brand || '',
          vendorCode: offer.vendorCode || offer.vendor_code || offer.article || '',
          available: normalizeAvailableStatus(offer),
          attributes,
          includeInExport: true, // По умолчанию товар включен в выгрузку
          rawOffer: offer // <-- сохраняем исходный оффер
        };
      });
      
      feed.products.push(...batchProducts);
      
      // Уведомляем о прогрессе
      if (onProgress) {
        onProgress(endIndex, totalOffers);
      }
      
      // Даем возможность браузеру обновить интерфейс
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    console.log(`Finished processing ${totalOffers} offers`);
    return feed;
    
  } catch (error) {
    console.error('Error processing large XML file:', error);
    throw new Error(`Failed to process large YML file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// --- Нормализация description и picture ---
function normalizeDescription(desc: any): string {
  if (typeof desc === 'string') return desc;
  if (desc && typeof desc === 'object') {
    if ('__cdata' in desc) return desc.__cdata;
    if ('#text' in desc) return desc['#text'];
    return JSON.stringify(desc);
  }
  return '';
}
function normalizePicture(pic: any): string[] {
  if (!pic) return [];
  if (Array.isArray(pic)) return pic.map(normalizePicture).flat();
  if (typeof pic === 'string') return [pic];
  if (typeof pic === 'object') {
    if ('#text' in pic) return [pic['#text']];
    if ('__cdata' in pic) return [pic['__cdata']];
    return Object.values(pic).map(normalizePicture).flat();
  }
  return [];
}

// --- Утилита для генерации id фида на основе sourceUrl ---
// UUID v5 (на основе sourceUrl, чтобы для одного и того же sourceUrl всегда был одинаковый id)
// Мини-реализация uuidv5 (namespace DNS)
function uuidv5(name: string) {
  // Простая реализация через hashCode + фиксированный namespace
  // (Для настоящей совместимости лучше использовать пакет 'uuid', но для коротких id этого достаточно)
  let hash = 0, i, chr;
  for (i = 0; i < name.length; i++) {
    chr   = name.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  // Преобразуем hash в hex и форматируем как UUID
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `${hex.substr(0, 8)}-${hex.substr(0, 4)}-5${hex.substr(4, 3)}-a${hex.substr(7, 3)}-${hex.substr(0, 12)}`;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getFeedId(sourceUrl?: string, feedName?: string) {
  // ВСЕГДА генерируем валидный UUID v4 для Supabase
  return uuidv4();
}

// --- batch insert для продуктов ---
export async function batchInsertProducts(products: Product[], feedId: string) {
  const BATCH_SIZE = 1000;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE).map(p => {
      const { rawOffer, ...rest } = p; // Исключаем rawOffer
      return { ...rest, feedId };
    });
    const { error } = await supabase.from('products').insert(batch);
    if (error) throw error;
  }
}