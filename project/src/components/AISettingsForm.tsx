import React, { useState, useEffect } from 'react';
import { AISettings, AIModel } from '../types/feed';
import { aiService } from '../services/aiService';

interface AISettingsFormProps {
  onSave: (settings: AISettings) => void;
  onCancel?: () => void;
}

export const AISettingsForm: React.FC<AISettingsFormProps> = ({ onSave, onCancel }) => {
  const [settings, setSettings] = useState<AISettings>(aiService.getSettings());
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [apiStatus, setApiStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [customModelInput, setCustomModelInput] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  
  // Загрузка настроек и моделей при монтировании
  useEffect(() => {
    // Загружаем существующие настройки
    const loadedSettings = aiService.loadSettings();
    setSettings(loadedSettings);
    
    // Проверяем, является ли модель одной из предопределенных
    const isCustomModel = !availableModels.some(model => model.id === loadedSettings.model) && 
                        !['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'].includes(loadedSettings.model);
    
    if (isCustomModel) {
      setUseCustomModel(true);
      setCustomModelInput(loadedSettings.model);
    }
    
    // Если есть ключ API, пробуем загрузить доступные модели
    if (loadedSettings.apiKey) {
      loadModels(loadedSettings);
    }
  }, []);
  
  // Загрузка доступных моделей
  const loadModels = async (currentSettings: AISettings) => {
    if (!currentSettings.apiKey) {
      setAvailableModels([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const models = await aiService.getAvailableModels();
      setAvailableModels(models);
      setErrorMessage('');
    } catch (error) {
      console.error('Ошибка при загрузке моделей:', error);
      setErrorMessage('Не удалось загрузить модели. Проверьте ключ API и URL.');
      setAvailableModels([
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 4096 },
        { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 16385 }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Обработка изменений в полях формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Если изменился API ключ или URL, сбрасываем статус теста API
    if (name === 'apiKey' || name === 'baseUrl') {
      setApiStatus('untested');
    }
  };
  
  // Тестирование API соединения
  const testAPIConnection = async () => {
    setIsTestingAPI(true);
    setApiStatus('untested');
    
    try {
      await loadModels(settings);
      setApiStatus('success');
    } catch (error) {
      console.error('Ошибка при тестировании API:', error);
      setApiStatus('error');
      setErrorMessage('Не удалось подключиться к API. Проверьте ключ и URL.');
    } finally {
      setIsTestingAPI(false);
    }
  };
  
  // Сохранение настроек
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Если используется пользовательская модель, применяем её
    if (useCustomModel && customModelInput.trim()) {
      setSettings(prev => ({
        ...prev,
        model: customModelInput.trim()
      }));
      
      aiService.updateSettings({
        ...settings,
        model: customModelInput.trim()
      });
      onSave({
        ...settings,
        model: customModelInput.trim()
      });
    } else {
      aiService.updateSettings(settings);
      onSave(settings);
    }
  };
  
  // Сброс настроек по умолчанию
  const resetToDefault = () => {
    const defaultSettings = {
      apiKey: settings.apiKey, // Сохраняем ключ API
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      defaultNamePrompt: 'Создай краткое и привлекательное название для товара на основе следующих данных: {{товар}}. Используй не более 60 символов.',
      defaultDescriptionPrompt: 'Создай привлекательное и информативное описание для товара на основе следующих данных: {{товар}}. Описание должно быть от 100 до 200 символов.',
      defaultLanguage: 'ru',
      defaultTone: 'профессиональный',
      defaultMaxTokens: 150
    };
    
    setSettings(defaultSettings);
    setUseCustomModel(false);
    setCustomModelInput('');
  };
  
  // Обработчик переключения между предустановленными моделями и пользовательским вводом
  const handleModelInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomModelInput(e.target.value);
  };
  
  const toggleCustomModel = () => {
    setUseCustomModel(!useCustomModel);
    
    if (!useCustomModel) {
      // Запоминаем текущую модель
      if (!customModelInput && settings.model) {
        setCustomModelInput(settings.model);
      }
    } else {
      // Возвращаемся к выбору из списка
      if (availableModels.length > 0) {
        setSettings(prev => ({
          ...prev,
          model: availableModels[0].id
        }));
      } else {
        setSettings(prev => ({
          ...prev,
          model: 'gpt-3.5-turbo'
        }));
      }
    }
  };
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Настройки ИИ</h2>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Ключ
          </label>
          <input
            type="password"
            name="apiKey"
            value={settings.apiKey}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="sk-..."
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL
          </label>
          <input
            type="text"
            name="baseUrl"
            value={settings.baseUrl}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://api.openai.com/v1"
            required
          />
        </div>
        
        <div className="mb-4">
          <button
            type="button"
            onClick={testAPIConnection}
            disabled={isTestingAPI || !settings.apiKey}
            className={`px-4 py-2 rounded-md text-white ${
              isTestingAPI ? 'bg-gray-400' : 
              apiStatus === 'success' ? 'bg-green-500' : 
              apiStatus === 'error' ? 'bg-red-500' : 
              'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isTestingAPI ? 'Проверка...' : 
             apiStatus === 'success' ? 'Соединение успешно' : 
             apiStatus === 'error' ? 'Ошибка соединения' : 
             'Проверить соединение'}
          </button>
        </div>
        
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Модель
          </label>
          
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="useCustomModel"
              checked={useCustomModel}
              onChange={toggleCustomModel}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="useCustomModel" className="ml-2 block text-sm text-gray-700">
              Ввести название модели вручную
            </label>
          </div>
          
          {useCustomModel ? (
            <input
              type="text"
              value={customModelInput}
              onChange={handleModelInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Введите название модели (например, gpt-4-1106-preview)"
              required={useCustomModel}
            />
          ) : (
            <select
              name="model"
              value={settings.model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              {availableModels.length > 0 ? (
                availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} (макс. токенов: {model.maxTokens})
                  </option>
                ))
              ) : (
                <>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </>
              )}
            </select>
          )}
          
          {useCustomModel && (
            <p className="mt-1 text-xs text-gray-500">
              Введите точное название модели API (например, gpt-4-1106-preview или llama3)
            </p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Промпт для названий (по умолчанию)
          </label>
          <textarea
            name="defaultNamePrompt"
            value={settings.defaultNamePrompt}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Введите промпт с плейсхолдером {{товар}}"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Промпт для описаний (по умолчанию)
          </label>
          <textarea
            name="defaultDescriptionPrompt"
            value={settings.defaultDescriptionPrompt}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Введите промпт с плейсхолдером {{товар}}"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Язык (по умолчанию)
          </label>
          <select
            name="defaultLanguage"
            value={settings.defaultLanguage}
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
            Тон (по умолчанию)
          </label>
          <select
            name="defaultTone"
            value={settings.defaultTone}
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
            name="defaultMaxTokens"
            value={settings.defaultMaxTokens}
            onChange={handleChange}
            min={10}
            max={4000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={resetToDefault}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Сбросить настройки
          </button>
          
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

export default AISettingsForm; 