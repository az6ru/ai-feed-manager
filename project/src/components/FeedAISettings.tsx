import React, { useState, useEffect } from 'react';
import { Feed, FeedAISettings } from '../types/feed';
import { aiService } from '../services/aiService';

interface FeedAISettingsProps {
  feed: Feed;
  onUpdate: (feed: Feed) => void;
  onCancel?: () => void;
}

export const FeedAISettingsForm: React.FC<FeedAISettingsProps> = ({ feed, onUpdate, onCancel }) => {
  const globalSettings = aiService.getSettings();
  
  console.log('FeedAISettingsForm: Текущие настройки фида:', feed.aiSettings);
  console.log('FeedAISettingsForm: Глобальные настройки:', globalSettings);
  
  // Состояние для отображения результатов тестирования
  const [testResults, setTestResults] = useState<{
    productName?: string;
    generatedName?: string;
    generatedDescription?: string;
    error?: string;
    isLoading?: boolean;
  }>({});
  
  // Инициализируем состояние из настроек фида или используем глобальные настройки как запасной вариант
  const [settings, setSettings] = useState<FeedAISettings>({
    namePrompt: feed.aiSettings?.namePrompt || globalSettings.defaultNamePrompt,
    descriptionPrompt: feed.aiSettings?.descriptionPrompt || globalSettings.defaultDescriptionPrompt,
    titlePrompt: feed.aiSettings?.titlePrompt || globalSettings.defaultTitlePrompt || 'Создай привлекательный заголовок для фида {{товар}}',
    summaryPrompt: feed.aiSettings?.summaryPrompt || globalSettings.defaultSummaryPrompt || 'Создай краткое описание всего фида на основе {{товар}}',
    language: feed.aiSettings?.language || globalSettings.defaultLanguage,
    tone: feed.aiSettings?.tone || globalSettings.defaultTone,
    maxTokens: feed.aiSettings?.maxTokens || globalSettings.defaultMaxTokens
  });
  
  // Проверка целостности настроек при монтировании компонента
  useEffect(() => {
    // Проверяем, что промпты не undefined/null
    if (!settings.namePrompt) {
      console.warn('FeedAISettingsForm: Промпт для названий undefined, устанавливаем значение по умолчанию');
      setSettings(prev => ({
        ...prev,
        namePrompt: globalSettings.defaultNamePrompt
      }));
    }
    
    if (!settings.descriptionPrompt) {
      console.warn('FeedAISettingsForm: Промпт для описаний undefined, устанавливаем значение по умолчанию');
      setSettings(prev => ({
        ...prev,
        descriptionPrompt: globalSettings.defaultDescriptionPrompt
      }));
    }
    
    if (!settings.titlePrompt) {
      console.warn('FeedAISettingsForm: Промпт для заголовка фида undefined, устанавливаем значение по умолчанию');
      setSettings(prev => ({
        ...prev,
        titlePrompt: globalSettings.defaultTitlePrompt || 'Создай привлекательный заголовок для фида {{товар}}'
      }));
    }
    
    if (!settings.summaryPrompt) {
      console.warn('FeedAISettingsForm: Промпт для описания фида undefined, устанавливаем значение по умолчанию');
      setSettings(prev => ({
        ...prev,
        summaryPrompt: globalSettings.defaultSummaryPrompt || 'Создай краткое описание всего фида на основе {{товар}}'
      }));
    }
  }, []);
  
  // Обработка изменений в полях формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: name === 'maxTokens' ? parseInt(value, 10) : value
    }));
  };
  
  // Сохранение настроек для фида
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Сохранение настроек AI для фида. Текущие настройки:', settings);
    console.log('Промпт для названий перед сохранением:', settings.namePrompt);
    console.log('Промпт для описаний перед сохранением:', settings.descriptionPrompt);
    
    // Проверяем, что промпты не пустые
    const finalSettings: FeedAISettings = {
      namePrompt: settings.namePrompt?.trim() || globalSettings.defaultNamePrompt,
      descriptionPrompt: settings.descriptionPrompt?.trim() || globalSettings.defaultDescriptionPrompt,
      titlePrompt: settings.titlePrompt?.trim() || globalSettings.defaultTitlePrompt || 'Создай привлекательный заголовок для фида {{товар}}',
      summaryPrompt: settings.summaryPrompt?.trim() || globalSettings.defaultSummaryPrompt || 'Создай краткое описание всего фида на основе {{товар}}',
      language: settings.language || globalSettings.defaultLanguage,
      tone: settings.tone || globalSettings.defaultTone,
      maxTokens: settings.maxTokens || globalSettings.defaultMaxTokens
    };
    
    // Создаем новый объект фида с обновленными настройками
    const updatedFeed = {
      ...feed,
      aiSettings: finalSettings
    };
    
    console.log('Обновленный фид после применения настроек AI:', updatedFeed.aiSettings);
    
    // Прежде чем вызвать onUpdate, проверим целостность объекта
    if (!updatedFeed.aiSettings) {
      console.error('Критическая ошибка: настройки AI отсутствуют после обновления!');
      alert('Ошибка при сохранении настроек. Попробуйте снова.');
      return;
    }
    
    if (!updatedFeed.aiSettings.namePrompt || !updatedFeed.aiSettings.descriptionPrompt) {
      console.warn('Предупреждение: один из промптов пуст, заменяем значением по умолчанию');
      if (!updatedFeed.aiSettings.namePrompt) {
        updatedFeed.aiSettings.namePrompt = globalSettings.defaultNamePrompt;
      }
      if (!updatedFeed.aiSettings.descriptionPrompt) {
        updatedFeed.aiSettings.descriptionPrompt = globalSettings.defaultDescriptionPrompt;
      }
    }
    
    onUpdate(updatedFeed);
  };
  
  // Сброс настроек к глобальным
  const resetToGlobal = () => {
    setSettings({
      namePrompt: globalSettings.defaultNamePrompt,
      descriptionPrompt: globalSettings.defaultDescriptionPrompt,
      titlePrompt: globalSettings.defaultTitlePrompt || 'Создай привлекательный заголовок для фида {{товар}}',
      summaryPrompt: globalSettings.defaultSummaryPrompt || 'Создай краткое описание всего фида на основе {{товар}}',
      language: globalSettings.defaultLanguage,
      tone: globalSettings.defaultTone,
      maxTokens: globalSettings.defaultMaxTokens
    });
  };
  
  // Генерация примера для выбранного товара (если есть)
  const generateExample = async () => {
    if (!feed.products || feed.products.length === 0) return;
    
    // Очищаем предыдущие результаты и показываем индикатор загрузки
    setTestResults({
      isLoading: true
    });
    
    try {
      // Берем первый товар для примера
      const product = feed.products[0];
      
      console.log('Генерация примера с настройками:', settings);
      console.log('Промпт для названия:', settings.namePrompt);
      console.log('Промпт для описания:', settings.descriptionPrompt);
      
      // Генерируем название и описание
      const name = await aiService.generateName(product, settings.namePrompt);
      const description = await aiService.generateDescription(product, settings.descriptionPrompt);
      
      console.log('Результат примера - Название:', name);
      console.log('Результат примера - Описание:', description);
      
      // Сохраняем результаты в состояние
      setTestResults({
        productName: product.name,
        generatedName: name,
        generatedDescription: description,
        isLoading: false
      });
    } catch (error) {
      console.error('Ошибка при генерации примера:', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        isLoading: false
      });
    }
  };
  
  // Функция для закрытия результатов тестирования
  const closeTestResults = () => {
    setTestResults({});
  };
  
  // Тестовая генерация для промптов фида
  const generateFeedExample = async () => {
    if (!feed.products || feed.products.length === 0) return;
    
    try {
      // Используем данные первых 3 товаров для примера
      const sampleProducts = feed.products.slice(0, 3);
      const productsData = sampleProducts.map(p => `Название: ${p.name}, Цена: ${p.price} ${p.currency}, ID: ${p.id}`).join("\n");
      
      alert(`Для генерации заголовка и описания фида будут использованы данные первых 3 товаров:\n\n${productsData}\n\nРеальная генерация будет использовать данные всех товаров.`);
    } catch (error) {
      console.error('Ошибка при подготовке примера для фида:', error);
      alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Настройки ИИ для фида "{feed.name}"</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <h3 className="text-md font-medium text-gray-800 mb-3">Промпты для товаров</h3>
          <p className="text-sm text-gray-600 mb-4">
            Эти промпты используются для генерации названий и описаний отдельных товаров
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Промпт для названий
            </label>
            <textarea
              name="namePrompt"
              value={settings.namePrompt}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Введите промпт с плейсхолдером {{товар}}"
            />
            <p className="mt-1 text-sm text-gray-500">
              Используйте {"{{товар}}"} как плейсхолдер для данных о товаре
            </p>
          </div>
          
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Промпт для описаний
            </label>
            <textarea
              name="descriptionPrompt"
              value={settings.descriptionPrompt}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Введите промпт с плейсхолдером {{товар}}"
            />
            <p className="mt-1 text-sm text-gray-500">
              Используйте {"{{товар}}"} как плейсхолдер для данных о товаре
            </p>
          </div>
          
          <div className="mt-3">
            <button
              type="button"
              onClick={generateExample}
              className="px-3 py-1 text-sm border rounded-md bg-green-50 text-green-700 border-green-300 hover:bg-green-100 flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 4.5L22 8L18 11.5"></path>
                <path d="M6 19.5L2 16L6 12.5"></path>
                <path d="M22 8H17.5C13.5 8 10.5 16 6.5 16H2"></path>
              </svg>
              Тестировать на товаре
            </button>
          </div>
          
          {/* Блок отображения результатов тестирования */}
          {(testResults.generatedName || testResults.generatedDescription || testResults.error || testResults.isLoading) && (
            <div className="mt-4 border rounded-md bg-white">
              <div className="bg-blue-50 p-3 border-b border-blue-100 flex justify-between items-center">
                <h4 className="text-sm font-medium text-blue-800">
                  Результаты тестирования
                </h4>
                <button 
                  type="button" 
                  onClick={closeTestResults}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              <div className="p-3">
                {testResults.isLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Генерация примера...</span>
                  </div>
                ) : testResults.error ? (
                  <div className="text-red-600 p-2 text-sm">
                    Ошибка: {testResults.error}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500">
                      Пример генерации для товара "{testResults.productName}":
                    </div>
                    
                    <div className="border-l-4 border-green-300 pl-3 py-1">
                      <div className="text-sm font-medium text-gray-700 mb-1">Сгенерированное название:</div>
                      <div className="text-sm pl-2">{testResults.generatedName}</div>
                    </div>
                    
                    <div className="border-l-4 border-blue-300 pl-3 py-1">
                      <div className="text-sm font-medium text-gray-700 mb-1">Сгенерированное описание:</div>
                      <div className="text-sm pl-2">{testResults.generatedDescription}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
          <h3 className="text-md font-medium text-gray-800 mb-3">Общие настройки</h3>
          <p className="text-sm text-gray-600 mb-4">
            Общие параметры для всех генераций AI
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Язык
            </label>
            <select
              name="language"
              value={settings.language}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тон
            </label>
            <select
              name="tone"
              value={settings.tone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="профессиональный">Профессиональный</option>
              <option value="casual">Повседневный</option>
              <option value="friendly">Дружелюбный</option>
              <option value="enthusiastic">Восторженный</option>
              <option value="informative">Информативный</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Максимальное количество токенов
            </label>
            <input
              type="number"
              name="maxTokens"
              value={settings.maxTokens}
              onChange={handleChange}
              min={10}
              max={4000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <div>
            <button
              type="button"
              onClick={resetToGlobal}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Сбросить к глобальным
            </button>
          </div>
          
          <div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Отмена
              </button>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Сохранить
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FeedAISettingsForm; 