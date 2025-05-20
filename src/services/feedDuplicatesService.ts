import { Feed, Product, ProductAttribute } from '../types/feed';

export interface ProductGroup {
  baseProduct: Product;
  variants: Product[];
  url: string;
  totalVariants: number;
  sizes: string[];
  colors: string[];
  attributes: Record<string, string[]>;
}

export interface DuplicatesAnalysisResult {
  originalProductCount: number;
  groupsCount: number;
  mergedProductsCount: number;
  productGroups: ProductGroup[];
  uniqueAttributes: Record<string, Set<string>>;
  attributesToMerge: string[];
}

/**
 * Анализирует фид и находит дубликаты товаров на основе URL
 * 
 * @param feed Исходный фид
 * @returns Результат анализа дубликатов
 */
export function analyzeDuplicates(feed: Feed): DuplicatesAnalysisResult {
  const productGroups: Record<string, Product[]> = {};
  const uniqueAttributes: Record<string, Set<string>> = {};
  
  // Шаг 1: Группировка товаров по URL
  feed.products.forEach(product => {
    // Используем URL как ключ для группировки
    const url = product.url || product.generatedUrl || '';
    
    if (!url) return; // Пропускаем товары без URL
    
    if (!productGroups[url]) {
      productGroups[url] = [];
    }
    
    productGroups[url].push(product);
    
    // Собираем уникальные имена атрибутов для анализа
    product.attributes.forEach(attr => {
      if (!uniqueAttributes[attr.name]) {
        uniqueAttributes[attr.name] = new Set<string>();
      }
      
      // Улучшаем преобразование объектных значений в строку
      let attrValue: string;
      if (typeof attr.value === 'object' && attr.value !== null) {
        try {
          // Для JSON объектов пробуем получить значение по различным ключам
          const objValue = attr.value as Record<string, any>;
          if (objValue.value !== undefined) {
            attrValue = String(objValue.value);
          } else if (objValue.text !== undefined) {
            attrValue = String(objValue.text);
          } else if (objValue.name !== undefined) {
            attrValue = String(objValue.name);
          } else if (objValue.label !== undefined) {
            attrValue = String(objValue.label);
          } else if (objValue.id !== undefined) {
            attrValue = String(objValue.id);
          } else {
            // Если не нашли известных ключей, пробуем получить первое значение из объекта
            const firstValue = Object.values(objValue)[0];
            if (firstValue !== undefined && (typeof firstValue === 'string' || typeof firstValue === 'number')) {
              attrValue = String(firstValue);
            } else {
              // В крайнем случае пытаемся преобразовать весь объект в JSON
              attrValue = JSON.stringify(objValue);
            }
          }
        } catch (e) {
          // Если что-то пошло не так, используем более безопасное представление
          attrValue = 'Сложное значение';
        }
      } else if (typeof attr.value === 'number' && attr.value === 0) {
        // Обработка числового нуля
        attrValue = '0';
      } else if (typeof attr.value === 'string' && attr.value === '0') {
        // Обработка строкового нуля
        attrValue = '0';
      } else {
        attrValue = String(attr.value);
      }
      
      uniqueAttributes[attr.name].add(attrValue);
    });
  });
  
  // Шаг 2: Анализ групп и создание результата
  const groupsWithMultipleProducts = Object.entries(productGroups)
    .filter(([_, products]) => products.length > 1)
    .map(([url, products]) => {
      // Для каждой группы собираем все значения атрибутов
      const groupAttributes: Record<string, string[]> = {};
      const sizes: string[] = [];
      const colors: string[] = [];
      
      products.forEach(product => {
        product.attributes.forEach(attr => {
          const name = attr.name.toLowerCase();
          
          // Улучшаем преобразование объектных значений в строку
          let value: string;
          if (typeof attr.value === 'object' && attr.value !== null) {
            try {
              // Для JSON объектов пробуем получить значение, если есть поле value или text
              const objValue = attr.value as Record<string, any>;
              if (objValue.value !== undefined) {
                value = String(objValue.value);
              } else if (objValue.text !== undefined) {
                value = String(objValue.text);
              } else if (objValue.name !== undefined) {
                value = String(objValue.name);
              } else if (objValue.label !== undefined) {
                value = String(objValue.label);
              } else if (objValue.id !== undefined) {
                value = String(objValue.id);
              } else {
                // Если не нашли известных ключей, пробуем получить первое значение из объекта
                const firstValue = Object.values(objValue)[0];
                if (firstValue !== undefined && (typeof firstValue === 'string' || typeof firstValue === 'number')) {
                  value = String(firstValue);
                } else {
                  // В крайнем случае пытаемся преобразовать весь объект в JSON
                  value = JSON.stringify(objValue);
                }
              }
            } catch (e) {
              value = 'Сложное значение';
            }
          } else if (typeof attr.value === 'number' && attr.value === 0) {
            // Обработка числового нуля
            value = '0';
          } else if (typeof attr.value === 'string' && attr.value === '0') {
            // Обработка строкового нуля
            value = '0';
          } else {
            value = String(attr.value);
          }
          
          if (!groupAttributes[name]) {
            groupAttributes[name] = [];
          }
          
          if (!groupAttributes[name].includes(value)) {
            groupAttributes[name].push(value);
          }
          
          // Отдельно собираем размеры и цвета для удобства
          if (name === 'размер' || name === 'size') {
            if (!sizes.includes(value)) {
              sizes.push(value);
            }
          } else if (name === 'цвет' || name === 'color') {
            if (!colors.includes(value)) {
              colors.push(value);
            }
          }
        });
      });
      
      return {
        baseProduct: products[0], // Первый продукт как основа
        variants: products,
        url,
        totalVariants: products.length,
        sizes,
        colors,
        attributes: groupAttributes
      };
    });
  
  // Шаг 3: Определяем атрибуты, которые нужно объединить
  // Автоматически добавляем размер и цвет, если они есть
  const attributesToMerge = [
    ...Object.keys(uniqueAttributes).filter(
      name => name.toLowerCase() === 'размер' || 
              name.toLowerCase() === 'size' || 
              name.toLowerCase() === 'цвет' || 
              name.toLowerCase() === 'color'
    )
  ];
  
  return {
    originalProductCount: feed.products.length,
    groupsCount: groupsWithMultipleProducts.length,
    mergedProductsCount: feed.products.length - groupsWithMultipleProducts.reduce(
      (total, group) => total + group.variants.length - 1, 0
    ),
    productGroups: groupsWithMultipleProducts,
    uniqueAttributes,
    attributesToMerge
  };
}

// Функция для чистки строк от [object Object]
function cleanValue(val: string): string {
  if (val === '[object Object]') {
    return '';
  }
  return val.replace(/\[object Object\]/g, '').replace(/,+/g, ',').replace(/^,|,$/g, '').trim();
}

// Функция для безопасного преобразования атрибутов в строку
function safeFormatAttribute(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Объединяет дубликаты товаров в фиде на основе URL
 * 
 * @param feed Исходный фид
 * @param attributesToMerge Массив имен атрибутов для объединения
 * @returns Новый фид с объединенными товарами
 */
export function mergeDuplicates(feed: Feed, attributesToMerge: string[]): Feed {
  const result = analyzeDuplicates(feed);
  const productGroups = result.productGroups;
  
  // Создаем новый список продуктов
  const mergedProducts: Product[] = [];
  const processedUrls = new Set<string>();
  // Карта: исходный id -> id мастер-товара
  const mergedIdMap: Record<string, string> = {};
  
  // Добавляем объединенные товары
  productGroups.forEach(group => {
    const { baseProduct, variants, url } = group;
    processedUrls.add(url);
    
    // Создаем мастер-товар на основе первого товара
    const masterProduct: Product = { ...baseProduct };
    
    // Объединяем атрибуты
    const combinedAttributes: Record<string, string[]> = {};
    const sizeValues: string[] = [];
    const colorValues: string[] = [];
    
    // Обрабатываем атрибуты всех вариантов
    variants.forEach(variant => {
      variant.attributes.forEach(attr => {
        const lowerName = attr.name.toLowerCase();
        
        // Улучшаем преобразование объектных значений в строку
        let attrValue: string;
        if (typeof attr.value === 'object' && attr.value !== null) {
          try {
            // Для JSON объектов пробуем получить значение по различным ключам
            const objValue = attr.value as Record<string, any>;
            if (objValue.value !== undefined) {
              attrValue = String(objValue.value);
            } else if (objValue.text !== undefined) {
              attrValue = String(objValue.text);
            } else if (objValue.name !== undefined) {
              attrValue = String(objValue.name);
            } else if (objValue.label !== undefined) {
              attrValue = String(objValue.label);
            } else if (objValue.id !== undefined) {
              attrValue = String(objValue.id);
            } else {
              // Если не нашли известных ключей, пробуем получить первое значение из объекта
              const firstValue = Object.values(objValue)[0];
              if (firstValue !== undefined && (typeof firstValue === 'string' || typeof firstValue === 'number')) {
                attrValue = String(firstValue);
              } else {
                // В крайнем случае пытаемся преобразовать весь объект в JSON
                attrValue = JSON.stringify(objValue);
              }
            }
          } catch (e) {
            // Если что-то пошло не так, используем более безопасное представление
            attrValue = 'Сложное значение';
          }
        } else if (typeof attr.value === 'number' && attr.value === 0) {
          // Обработка числового нуля
          attrValue = '0';
        } else if (typeof attr.value === 'string' && attr.value === '0') {
          // Обработка строкового нуля
          attrValue = '0';
        } else {
          attrValue = String(attr.value);
        }
        
        // Отдельно собираем значения размеров и цветов
        if (lowerName === 'размер' || lowerName === 'size') {
          if (!sizeValues.includes(attrValue)) {
            sizeValues.push(attrValue);
          }
        } else if (lowerName === 'цвет' || lowerName === 'color') {
          if (!colorValues.includes(attrValue)) {
            colorValues.push(attrValue);
          }
        }
        
        // Собираем все атрибуты, выбранные для объединения
        if (attributesToMerge.some(name => name.toLowerCase() === lowerName)) {
          if (!combinedAttributes[attr.name]) {
            combinedAttributes[attr.name] = [];
          }
          
          if (!combinedAttributes[attr.name].includes(attrValue)) {
            combinedAttributes[attr.name].push(attrValue);
          }
        }
      });
    });
    
    // Создаем новые атрибуты для мастер-товара
    // Сначала копируем все существующие атрибуты, которые не подлежат объединению
    const newAttributes: ProductAttribute[] = [
      ...baseProduct.attributes.filter(attr => 
        !attributesToMerge.some(name => 
          name.toLowerCase() === attr.name.toLowerCase()
        )
      )
    ];
    
    // Добавляем объединенные атрибуты
    Object.entries(combinedAttributes).forEach(([name, values]) => {
      const safeFormattedValues = values.map(v => String(v)).filter(v => v && v.trim() !== '');
      newAttributes.push({
        id: `combined_${name.toLowerCase().replace(/\s+/g, '_')}`,
        name,
        value: safeFormattedValues.join(', ')
      });
    });
    
    // Явно добавляем размеры, если они есть
    if (sizeValues.length > 0) {
      const safeFormattedSizes = sizeValues.map(v => String(v)).filter(v => v && v.trim() !== '');
      const existingSizeAttrIndex = newAttributes.findIndex(attr => 
        attr.name.toLowerCase() === 'размер' || attr.name.toLowerCase() === 'size'
      );
      if (existingSizeAttrIndex !== -1) {
        newAttributes[existingSizeAttrIndex] = {
          ...newAttributes[existingSizeAttrIndex],
          value: safeFormattedSizes.join(', ')
        };
      } else {
        newAttributes.push({
          id: 'combined_sizes',
          name: 'размер',
          value: safeFormattedSizes.join(', ')
        });
      }
    }
    
    // Явно добавляем цвета, если они есть
    if (colorValues.length > 0) {
      const safeFormattedColors = colorValues.map(v => String(v)).filter(v => v && v.trim() !== '');
      const existingColorAttrIndex = newAttributes.findIndex(attr => 
        attr.name.toLowerCase() === 'цвет' || attr.name.toLowerCase() === 'color'
      );
      if (existingColorAttrIndex !== -1) {
        newAttributes[existingColorAttrIndex] = {
          ...newAttributes[existingColorAttrIndex],
          value: safeFormattedColors.join(', ')
        };
      } else {
        newAttributes.push({
          id: 'combined_colors',
          name: 'цвет',
          value: safeFormattedColors.join(', ')
        });
      }
    }
    
    // Обновляем атрибуты мастер-товара
    masterProduct.attributes = newAttributes;
    
    // Устанавливаем доступность товара (true, если хотя бы один вариант доступен)
    masterProduct.available = variants.some(variant => variant.available);
    
    // Добавляем поле, указывающее на объединение
    masterProduct.mergedFromVariants = variants.length;
    masterProduct.mergedAttributes = attributesToMerge;
    
    // Сохраняем информацию о размерах в явном виде для интерфейса
    if (sizeValues.length > 0) {
      masterProduct.mergedSizes = sizeValues;
    }
    
    // Сохраняем соответствие id всех вариантов -> id мастер-товара
    variants.forEach(v => {
      mergedIdMap[v.id] = masterProduct.id;
    });
    
    mergedProducts.push(masterProduct);
  });
  
  // Добавляем товары, которые не имеют дубликатов
  feed.products.forEach(product => {
    const url = product.url || product.generatedUrl || '';
    if (!url || !processedUrls.has(url)) {
      mergedProducts.push({ ...product });
    }
  });
  
  // Создаем новый фид с объединенными товарами, но сохраняем исходный ID
  return {
    ...feed,
    products: mergedProducts,
    dateModified: new Date().toISOString(),
    metadata: {
      ...feed.metadata,
      mergedIdMap // сохраняем карту объединённых id
    }
  };
} 