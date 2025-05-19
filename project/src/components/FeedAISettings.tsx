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
    <div className="bg-white shadow rounded-xl p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="inline-block bg-blue-100 text-blue-600 rounded-full p-2 mr-2">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
        Настройки AI для фида «{feed.name}»
      </h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Промпты для товаров */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">Промпты для товаров</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Промпт для названий</label>
              <textarea
                name="namePrompt"
                value={settings.namePrompt}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                placeholder="Введите промпт с плейсхолдером {{товар}}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Промпт для описаний</label>
              <textarea
                name="descriptionPrompt"
                value={settings.descriptionPrompt}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                placeholder="Введите промпт с плейсхолдером {{товар}}"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={generateExample}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M18 4.5L22 8L18 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 19.5L2 16L6 12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 8H17.5C13.5 8 10.5 16 6.5 16H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Тестировать на товаре
            </button>
            <button
              type="button"
              onClick={resetToGlobal}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition border border-gray-200"
            >
              Сбросить к глобальным
            </button>
          </div>
          {/* Блок тестирования */}
          {(testResults.generatedName || testResults.generatedDescription || testResults.error || testResults.isLoading) && (
            <div className="mt-4 border rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-700 flex items-center gap-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Результаты тестирования
                </span>
                <button type="button" onClick={closeTestResults} className="text-gray-400 hover:text-gray-700 p-1 rounded">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/></svg>
                </button>
              </div>
              <div>
                {testResults.isLoading ? (
                  <div className="flex items-center gap-2 text-blue-500">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Генерация примера...
                  </div>
                ) : testResults.error ? (
                  <div className="text-red-600 p-2 text-sm flex items-center gap-2">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Ошибка: {testResults.error}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">
                      Пример для товара: <span className="font-semibold text-gray-700">{testResults.productName}</span>
                    </div>
                    <div className="bg-white rounded p-2 border-l-4 border-green-300">
                      <div className="text-xs font-medium text-gray-700 mb-1">Сгенерированное название:</div>
                      <div className="text-sm pl-2">{testResults.generatedName}</div>
                    </div>
                    <div className="bg-white rounded p-2 border-l-4 border-blue-300">
                      <div className="text-xs font-medium text-gray-700 mb-1">Сгенерированное описание:</div>
                      <div className="text-sm pl-2">{testResults.generatedDescription}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
        {/* Общие настройки */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">Общие настройки</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Язык</label>
              <select
                name="language"
                value={settings.language}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="it">Italiano</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тон</label>
              <select
                name="tone"
                value={settings.tone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              >
                <option value="профессиональный">Профессиональный</option>
                <option value="casual">Повседневный</option>
                <option value="friendly">Дружелюбный</option>
                <option value="enthusiastic">Восторженный</option>
                <option value="informative">Информативный</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Максимум токенов</label>
              <input
                type="number"
                name="maxTokens"
                value={settings.maxTokens}
                onChange={handleChange}
                min={10}
                max={4000}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              />
            </div>
          </div>
        </section>
        {/* Кнопки */}
        <div className="flex justify-end gap-3 pt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
            >
              Отмена
            </button>
          )}
          <button
            type="submit"
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedAISettingsForm; 