import { AISettings, AIModel, Feed, Product, AIGenerationResult } from '../types/feed';

// Настройки по умолчанию
const DEFAULT_AI_SETTINGS: AISettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  defaultNamePrompt: 'Создай краткое и привлекательное название для товара на основе следующих данных: {{товар}}. Используй не более 60 символов.',
  defaultDescriptionPrompt: 'Создай привлекательное и информативное описание для товара на основе следующих данных: {{товар}}. Описание должно быть от 100 до 200 символов.',
  defaultLanguage: 'ru',
  defaultTone: 'профессиональный',
  defaultMaxTokens: 150
};

// Класс для работы с OpenAI API
export class AIService {
  private settings: AISettings;
  
  constructor(settings?: Partial<AISettings>) {
    this.settings = { ...DEFAULT_AI_SETTINGS, ...settings };
  }
  
  // Получить настройки ИИ
  getSettings(): AISettings {
    return this.settings;
  }
  
  // Обновить настройки ИИ
  updateSettings(newSettings: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('aiSettings', JSON.stringify(this.settings));
  }
  
  // Сохранить настройки ИИ
  saveSettings(): void {
    localStorage.setItem('aiSettings', JSON.stringify(this.settings));
  }
  
  // Загрузить настройки ИИ
  loadSettings(): AISettings {
    const savedSettings = localStorage.getItem('aiSettings');
    if (savedSettings) {
      this.settings = { ...DEFAULT_AI_SETTINGS, ...JSON.parse(savedSettings) };
    }
    return this.settings;
  }
  
  // Получить список доступных моделей OpenAI
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.settings.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка получения списка моделей: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Фильтруем только модели для генерации текста
      const textModels = data.data.filter((model: any) => 
        model.id.includes('gpt') || 
        model.id.includes('text-davinci') ||
        model.id.includes('text-curie') ||
        model.id.includes('text-babbage') ||
        model.id.includes('text-ada')
      );
      
      return textModels.map((model: any) => ({
        id: model.id,
        name: model.id,
        maxTokens: model.id.includes('gpt-4') ? 8192 : 4096
      }));
    } catch (error) {
      console.error('Ошибка при получении моделей:', error);
      return [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 4096 },
        { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 16385 }
      ];
    }
  }
  
  // Генерировать название для товара
  async generateName(product: Product, customPrompt?: string): Promise<string> {
    console.log('generateName вызван с промптом:', customPrompt || this.settings.defaultNamePrompt);
    console.log('Тип промпта в generateName:', typeof customPrompt);
    
    // Если промпт пустой или undefined, используем промпт по умолчанию
    if (!customPrompt || customPrompt.trim() === '') {
      console.warn('Пустой промпт передан в generateName, используем промпт по умолчанию');
      customPrompt = this.settings.defaultNamePrompt;
    }
    
    // Убедимся, что промпт - строка
    const prompt = String(customPrompt);
    console.log('Финальный промпт для названия после обработки:', prompt);
    return this.generateText(prompt, product);
  }
  
  // Генерировать описание для товара
  async generateDescription(product: Product, customPrompt?: string): Promise<string> {
    console.log('generateDescription вызван с промптом:', customPrompt || this.settings.defaultDescriptionPrompt);
    console.log('Тип промпта в generateDescription:', typeof customPrompt);
    
    // Если промпт пустой или undefined, используем промпт по умолчанию
    if (!customPrompt || customPrompt.trim() === '') {
      console.warn('Пустой промпт передан в generateDescription, используем промпт по умолчанию');
      customPrompt = this.settings.defaultDescriptionPrompt;
    }
    
    // Убедимся, что промпт - строка
    const prompt = String(customPrompt);
    console.log('Финальный промпт для описания после обработки:', prompt);
    return this.generateText(prompt, product);
  }
  
  // Генерировать текст с использованием OpenAI API
  private async generateText(prompt: string, product: Product): Promise<string> {
    try {
      // Проверка наличия промпта
      if (!prompt || prompt.trim() === '') {
        console.error('Пустой промпт передан в generateText!');
        throw new Error('Пустой промпт для генерации текста');
      }
      
      // Проверка наличия API ключа
      if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
        console.error('API ключ не настроен!');
        throw new Error('API ключ OpenAI не настроен. Пожалуйста, добавьте ключ API в настройках.');
      }
      
      // Подготавливаем данные о товаре
      const productData = this.prepareProductData(product);
      
      // Заменяем плейсхолдер в промпте на данные о товаре
      const fullPrompt = prompt.replace('{{товар}}', JSON.stringify(productData));
      
      console.log('Запрос к API:', {
        model: this.settings.model,
        systemContent: `Ты помощник по созданию описаний товаров. Язык: ${this.settings.defaultLanguage}. Тон: ${this.settings.defaultTone}.`,
        userPrompt: fullPrompt,
        maxTokens: this.settings.defaultMaxTokens
      });
      
      const requestBody = {
        model: this.settings.model,
        messages: [
          {
            role: 'system',
            content: `Ты помощник по созданию описаний товаров. Язык: ${this.settings.defaultLanguage}. Тон: ${this.settings.defaultTone}.`
          },
          {
            role: 'user',
            content: fullPrompt
          }
        ],
        max_tokens: this.settings.defaultMaxTokens,
        temperature: 0.7
      };
      
      console.log('Полный запрос к API:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${this.settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Ошибка ответа API:', error);
        throw new Error(`Ошибка API: ${error.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Ответ API:', data);
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Ошибка генерации текста:', error);
      throw error;
    }
  }
  
  // Подготовить данные о товаре для отправки в API
  private prepareProductData(product: Product): any {
    return {
      name: product.name,
      price: product.price,
      currency: product.currency,
      description: product.description || '',
      vendor: product.vendor || '',
      vendorCode: product.vendorCode || '',
      attributes: product.attributes.map(attr => ({
        name: attr.name,
        value: attr.value
      }))
    };
  }
  
  // Генерировать названия и описания для всех товаров в фиде
  async generateForFeed(feed: Feed, options: {
    generateNames?: boolean,
    generateDescriptions?: boolean,
    batchSize?: number,
    onProgress?: (progress: number, total: number) => void
  }): Promise<AIGenerationResult[]> {
    const { generateNames = true, generateDescriptions = true, batchSize = 5, onProgress } = options;
    
    const results: AIGenerationResult[] = [];
    const totalProducts = feed.products.length;
    
    // ВАЖНО: Проверяем, что у фида есть настройки AI
    if (!feed.aiSettings) {
      console.error('!!! ОШИБКА: У фида отсутствуют настройки AI !!!');
      console.log('feed объект:', feed);
      console.log('Создаем временные настройки AI для фида');
      
      feed = {
        ...feed,
        aiSettings: {
          namePrompt: this.settings.defaultNamePrompt,
          descriptionPrompt: this.settings.defaultDescriptionPrompt,
          language: this.settings.defaultLanguage,
          tone: this.settings.defaultTone,
          maxTokens: this.settings.defaultMaxTokens
        }
      };
    }
    
    // Получаем промпты из настроек фида или из общих настроек
    // Используем явное присваивание вместо короткого синтаксиса для лучшей отладки
    let namePrompt: string;
    if (feed.aiSettings && feed.aiSettings.namePrompt && feed.aiSettings.namePrompt.trim() !== '') {
      namePrompt = feed.aiSettings.namePrompt;
      console.log('Используем промпт для названий из настроек фида:', namePrompt);
    } else {
      namePrompt = this.settings.defaultNamePrompt;
      console.log('Используем промпт для названий по умолчанию:', namePrompt);
    }
    
    let descriptionPrompt: string;
    if (feed.aiSettings && feed.aiSettings.descriptionPrompt && feed.aiSettings.descriptionPrompt.trim() !== '') {
      descriptionPrompt = feed.aiSettings.descriptionPrompt;
      console.log('Используем промпт для описаний из настроек фида:', descriptionPrompt);
    } else {
      descriptionPrompt = this.settings.defaultDescriptionPrompt;
      console.log('Используем промпт для описаний по умолчанию:', descriptionPrompt);
    }
    
    // Сохраняем текущие настройки, чтобы восстановить их после генерации
    const currentLanguage = this.settings.defaultLanguage;
    const currentTone = this.settings.defaultTone;
    const currentMaxTokens = this.settings.defaultMaxTokens;
    
    // Дебаг: выводим детальную информацию о настройках и промптах
    console.log('---------- ОТЛАДКА НАСТРОЕК ФИДА ----------');
    console.log('feed.aiSettings:', JSON.stringify(feed.aiSettings, null, 2));
    console.log('Исходный промпт для названий из настроек фида:', feed.aiSettings?.namePrompt);
    console.log('Исходный промпт для описаний из настроек фида:', feed.aiSettings?.descriptionPrompt);
    console.log('Промпт для названий после обработки:', namePrompt);
    console.log('Промпт для описаний после обработки:', descriptionPrompt);
    console.log('--------------------------------------------');
    
    // Устанавливаем язык и тон из настроек фида, если они указаны
    if (feed.aiSettings?.language) {
      this.settings.defaultLanguage = feed.aiSettings.language;
    }
    
    if (feed.aiSettings?.tone) {
      this.settings.defaultTone = feed.aiSettings.tone;
    }
    
    if (feed.aiSettings?.maxTokens) {
      this.settings.defaultMaxTokens = feed.aiSettings.maxTokens;
    }
    
    console.log('Настройки AI фида:', feed.aiSettings);
    console.log('Промпт для названий:', namePrompt);
    console.log('Промпт для описаний:', descriptionPrompt);
    console.log('Применены настройки языка и тона:', {
      language: this.settings.defaultLanguage,
      tone: this.settings.defaultTone,
      maxTokens: this.settings.defaultMaxTokens
    });
    
    try {
      // Обрабатываем товары батчами для избежания перегрузки API
      for (let i = 0; i < totalProducts; i += batchSize) {
        const batch = feed.products.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (product) => {
          try {
            const result: AIGenerationResult = { productId: product.id };
            
            if (generateNames) {
              console.log(`Генерация названия для товара ${product.id} с промптом:`, namePrompt);
              console.log('Тип промпта:', typeof namePrompt);
              console.log('Длина промпта:', namePrompt.length);
              
              // Явно передаем промпт, чтобы избежать ошибок
              if (namePrompt && namePrompt.trim() !== '') {
                // Важно: Напрямую передаем строку промпта, а не копируем ссылку
                result.generatedName = await this.generateName(product, String(namePrompt));
              } else {
                console.error('Пустой промпт для названия!');
                throw new Error('Пустой промпт для названия');
              }
            }
            
            if (generateDescriptions) {
              console.log(`Генерация описания для товара ${product.id} с промптом:`, descriptionPrompt);
              console.log('Тип промпта для описания:', typeof descriptionPrompt);
              console.log('Длина промпта для описания:', descriptionPrompt.length);
              
              // Явно передаем промпт, чтобы избежать ошибок
              if (descriptionPrompt && descriptionPrompt.trim() !== '') {
                // Важно: Напрямую передаем строку промпта, а не копируем ссылку
                result.generatedDescription = await this.generateDescription(product, String(descriptionPrompt));
              } else {
                console.error('Пустой промпт для описания!');
                throw new Error('Пустой промпт для описания');
              }
            }
            
            return result;
          } catch (error) {
            return {
              productId: product.id,
              error: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        if (onProgress) {
          onProgress(Math.min(i + batchSize, totalProducts), totalProducts);
        }
        
        // Небольшая задержка между батчами, чтобы не перегружать API
        if (i + batchSize < totalProducts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return results;
    } finally {
      // Восстанавливаем исходные настройки
      this.settings.defaultLanguage = currentLanguage;
      this.settings.defaultTone = currentTone;
      this.settings.defaultMaxTokens = currentMaxTokens;
    }
  }
  
  // Применить результаты генерации к фиду
  applyGenerationResults(feed: Feed, results: AIGenerationResult[], autoApprove: boolean = false): Feed {
    console.log('Применение результатов генерации AI. Количество результатов:', results.length);
    console.log('Примеры результатов:', results.slice(0, 2));
    
    // Проверка на наличие данных
    if (!results || results.length === 0) {
      console.warn('Нет результатов для применения к фиду!');
      return feed;
    }
    
    const updatedProducts = feed.products.map(product => {
      const result = results.find(r => r.productId === product.id);
      if (result && !result.error) {
        const generatedName = result.generatedName && result.generatedName.trim() !== '' 
          ? result.generatedName 
          : product.generatedName;
        const generatedDescription = result.generatedDescription && result.generatedDescription.trim() !== '' 
          ? result.generatedDescription 
          : product.generatedDescription;
        if (autoApprove) {
          // Автоматически применяем значения
          return {
            ...product,
            name: generatedName || product.name,
            description: generatedDescription || product.description,
            generatedName,
            generatedDescription
          };
        } else {
          // Только сохраняем как черновик
          return {
            ...product,
            generatedName,
            generatedDescription
          };
        }
      }
      if (result && result.error) {
        console.error(`Ошибка генерации для продукта ${product.id}:`, result.error);
      }
      return product;
    });
    
    const updatedFeed = {
      ...feed,
      products: updatedProducts
    };
    
    console.log('Обновление фида завершено. Обновлено продуктов:', 
      updatedProducts.filter(p => p.generatedName || p.generatedDescription).length);
    
    return updatedFeed;
  }
}

// Экспортируем экземпляр сервиса
export const aiService = new AIService();
export default aiService; 