import React, { useState } from 'react';
import { Feed, AIGenerationResult } from '../types/feed';
import { aiService } from '../services/aiService';

interface AIBulkGenerationProps {
  feed: Feed;
  onComplete: (updatedFeed: Feed, results: AIGenerationResult[]) => void;
  onCancel: () => void;
}

export const AIBulkGeneration: React.FC<AIBulkGenerationProps> = ({ feed, onComplete, onCancel }) => {
  const [options, setOptions] = useState({
    generateNames: true,
    generateDescriptions: true,
    batchSize: 5
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalItems, setTotalItems] = useState(feed.products.length);
  const [results, setResults] = useState<AIGenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{title?: string, description?: string} | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  
  // Обработка изменений в опциях
  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value, 10) : value
    }));
  };
  
  // Запуск тестовой генерации для проверки настроек
  const runTestGeneration = async () => {
    if (!feed.products || feed.products.length === 0) {
      setError('Нет товаров для тестирования');
      return;
    }
    
    setIsTesting(true);
    setError(null);
    setTestResult(null);
    
    try {
      // Берем первый товар для теста
      const testProduct = feed.products[0];
      
      // Создаем копию фида для теста
      const feedWithSettings = { ...feed };
      
      // Проверяем наличие настроек фида
      if (!feedWithSettings.aiSettings) {
        console.warn('Тестирование: Настройки AI не найдены в фиде, используются настройки по умолчанию');
        
        // Загружаем настройки по умолчанию
        const defaultSettings = aiService.getSettings();
        
        // Создаем настройки фида, если их нет
        feedWithSettings.aiSettings = {
          namePrompt: defaultSettings.defaultNamePrompt,
          descriptionPrompt: defaultSettings.defaultDescriptionPrompt,
          language: defaultSettings.defaultLanguage,
          tone: defaultSettings.defaultTone,
          maxTokens: defaultSettings.defaultMaxTokens
        };
      }
      
      console.log('Тестирование с настройками фида:', feedWithSettings.aiSettings);
      
      // Получаем промпты из настроек фида или из общих настроек
      const namePrompt = feedWithSettings.aiSettings.namePrompt || aiService.getSettings().defaultNamePrompt;
      const descriptionPrompt = feedWithSettings.aiSettings.descriptionPrompt || aiService.getSettings().defaultDescriptionPrompt;
      
      // Временно сохраняем настройки языка и тона
      const currentSettings = aiService.getSettings();
      const tempSettings = {
        defaultLanguage: currentSettings.defaultLanguage,
        defaultTone: currentSettings.defaultTone,
        defaultMaxTokens: currentSettings.defaultMaxTokens
      };
      
      // Применяем настройки из фида
      if (feedWithSettings.aiSettings.language) {
        aiService.updateSettings({ defaultLanguage: feedWithSettings.aiSettings.language });
      }
      
      if (feedWithSettings.aiSettings.tone) {
        aiService.updateSettings({ defaultTone: feedWithSettings.aiSettings.tone });
      }
      
      if (feedWithSettings.aiSettings.maxTokens) {
        aiService.updateSettings({ defaultMaxTokens: feedWithSettings.aiSettings.maxTokens });
      }
      
      // Запускаем тестовые генерации
      let title, description;
      
      if (options.generateNames) {
        title = await aiService.generateName(testProduct, namePrompt);
      }
      
      if (options.generateDescriptions) {
        description = await aiService.generateDescription(testProduct, descriptionPrompt);
      }
      
      // Восстанавливаем настройки
      aiService.updateSettings({
        defaultLanguage: tempSettings.defaultLanguage,
        defaultTone: tempSettings.defaultTone,
        defaultMaxTokens: tempSettings.defaultMaxTokens
      });
      
      setTestResult({ title, description });
    } catch (error) {
      console.error('Ошибка при тестировании:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка при тестировании');
    } finally {
      setIsTesting(false);
    }
  };
  
  // Запуск генерации
  const startGeneration = async () => {
    if (!feed.products || feed.products.length === 0) {
      setError('Нет товаров для генерации');
      return;
    }
    
    setIsGenerating(true);
    setProgress(0);
    setTotalItems(feed.products.length);
    setError(null);
    
    try {
      // Проверка API ключа
      const settings = aiService.getSettings();
      if (!settings.apiKey || settings.apiKey.trim() === '') {
        throw new Error('API ключ не настроен. Откройте настройки и добавьте ключ API.');
      }
      
      console.log('Начало генерации с настройками фида:', feed.aiSettings);
      
      // Создаем копию фида для гарантии, что настройки будут переданы
      const feedWithSettings = { ...feed };
      
      // Проверяем наличие настроек фида
      if (!feedWithSettings.aiSettings) {
        console.warn('Настройки AI не найдены в фиде, используются настройки по умолчанию');
        
        // Загружаем настройки по умолчанию
        const defaultSettings = aiService.getSettings();
        
        // Создаем настройки фида, если их нет
        feedWithSettings.aiSettings = {
          namePrompt: defaultSettings.defaultNamePrompt,
          descriptionPrompt: defaultSettings.defaultDescriptionPrompt,
          language: defaultSettings.defaultLanguage,
          tone: defaultSettings.defaultTone,
          maxTokens: defaultSettings.defaultMaxTokens
        };
      }
      
      console.log('Используемые настройки фида для генерации:', feedWithSettings.aiSettings);
      
      // Запускаем генерацию
      const generationResults = await aiService.generateForFeed(feedWithSettings, {
        generateNames: options.generateNames,
        generateDescriptions: options.generateDescriptions,
        batchSize: options.batchSize,
        onProgress: (current, total) => {
          setProgress(current);
          setTotalItems(total);
        }
      });
      
      setResults(generationResults);
      
      // Применяем результаты к фиду
      const updatedFeed = aiService.applyGenerationResults(feedWithSettings, generationResults);
      
      // Вызываем обработчик завершения
      onComplete(updatedFeed, generationResults);
    } catch (error) {
      console.error('Ошибка при генерации:', error);
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          setError('Ошибка API ключа: Проверьте наличие и правильность API ключа в настройках.');
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          setError('Ошибка сети: Не удалось подключиться к API. Проверьте подключение к интернету.');
        } else {
          setError(`Ошибка: ${error.message}`);
        }
      } else {
        setError('Неизвестная ошибка при генерации');
      }
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Массовая генерация для {feed.products.length} товаров</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Настройки AI для этого фида:</h3>
        <div className="bg-gray-50 p-3 rounded-md text-xs">
          <p><strong>Промпт для названий:</strong> {feed.aiSettings?.namePrompt || 'Не задан (будет использован промпт по умолчанию)'}</p>
          <p><strong>Промпт для описаний:</strong> {feed.aiSettings?.descriptionPrompt || 'Не задан (будет использован промпт по умолчанию)'}</p>
          <p><strong>Язык:</strong> {feed.aiSettings?.language || 'По умолчанию'}</p>
          <p><strong>Тон:</strong> {feed.aiSettings?.tone || 'По умолчанию'}</p>
        </div>
        
        <div className="mt-3">
          <button
            type="button"
            onClick={runTestGeneration}
            disabled={isTesting || (!options.generateNames && !options.generateDescriptions)}
            className={`px-3 py-1 text-sm border rounded-md ${
              isTesting ? 'bg-gray-300 text-gray-600' : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
            }`}
          >
            {isTesting ? 'Тестирование...' : 'Протестировать настройки'}
          </button>
        </div>
      </div>
      
      {testResult && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-700 mb-2">Результат тестирования:</h3>
          {testResult.title && (
            <div className="mb-2">
              <p className="text-xs text-gray-500">Название:</p>
              <p className="text-sm">{testResult.title}</p>
            </div>
          )}
          {testResult.description && (
            <div>
              <p className="text-xs text-gray-500">Описание:</p>
              <p className="text-sm">{testResult.description}</p>
            </div>
          )}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="generateNames"
            name="generateNames"
            checked={options.generateNames}
            onChange={handleOptionChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            disabled={isGenerating}
          />
          <label htmlFor="generateNames" className="ml-2 block text-sm text-gray-900">
            Генерировать названия
          </label>
        </div>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="generateDescriptions"
            name="generateDescriptions"
            checked={options.generateDescriptions}
            onChange={handleOptionChange}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            disabled={isGenerating}
          />
          <label htmlFor="generateDescriptions" className="ml-2 block text-sm text-gray-900">
            Генерировать описания
          </label>
        </div>
        
        <div className="mb-4">
          <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700 mb-1">
            Размер батча (товаров за раз)
          </label>
          <input
            type="number"
            id="batchSize"
            name="batchSize"
            value={options.batchSize}
            onChange={handleOptionChange}
            min={1}
            max={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isGenerating}
          />
          <p className="mt-1 text-xs text-gray-500">
            Меньший размер батча снизит нагрузку на API, но увеличит время генерации.
          </p>
        </div>
      </div>
      
      {isGenerating && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Прогресс генерации</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full" 
              style={{ width: `${(progress / totalItems) * 100}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Обработано {progress} из {totalItems} товаров ({Math.round((progress / totalItems) * 100)}%)
          </p>
        </div>
      )}
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={isGenerating}
        >
          Отмена
        </button>
        
        <button
          type="button"
          onClick={startGeneration}
          disabled={isGenerating || (!options.generateNames && !options.generateDescriptions)}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isGenerating || (!options.generateNames && !options.generateDescriptions)
              ? 'bg-gray-400'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {isGenerating ? 'Генерация...' : 'Начать генерацию'}
        </button>
      </div>
      
      {results.length > 0 && !isGenerating && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Результаты генерации</h3>
          
          <div className="mb-2">
            <span className="text-sm font-medium text-gray-700">
              Всего обработано: {results.length} товаров
            </span>
          </div>
          
          <div className="mb-2">
            <span className="text-sm font-medium text-green-700">
              Успешно: {results.filter(r => !r.error).length} товаров
            </span>
          </div>
          
          {results.some(r => r.error) && (
            <div className="mb-2">
              <span className="text-sm font-medium text-red-700">
                С ошибками: {results.filter(r => r.error).length} товаров
              </span>
            </div>
          )}
          
          {results.some(r => r.error) && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Примеры ошибок:</h4>
              <ul className="list-disc pl-5 text-sm text-red-700">
                {results
                  .filter(r => r.error)
                  .slice(0, 3)
                  .map((result, index) => (
                    <li key={index}>{result.error}</li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIBulkGeneration; 