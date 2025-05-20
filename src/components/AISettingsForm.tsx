import React, { useState } from 'react';
import { AISettings, AIModel } from '../types/feed';

interface AISettingsFormProps {
  settings: AISettings;
  onChange: (settings: AISettings) => void;
  onSave: (settings: AISettings) => void;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
}

const defaultModels: AIModel[] = [
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 4096 },
  { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 16385 }
];

async function fetchOpenAIModels(apiKey: string, baseUrl: string): Promise<AIModel[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Ошибка соединения или неверный ключ');
    const data = await res.json();
    if (!data.data) throw new Error('Некорректный ответ API');
    // Фильтруем только chat/completion модели
    return data.data
      .filter((m: any) => m.id.startsWith('gpt-'))
      .map((m: any) => ({ id: m.id, name: m.id, maxTokens: 4096 }));
  } catch (e: any) {
    throw new Error(e.message || 'Ошибка проверки API');
  }
}

const AISettingsForm: React.FC<AISettingsFormProps> = ({ settings, onChange, onSave, loading, error, success }) => {
  const [apiStatus, setApiStatus] = useState<'untested' | 'success' | 'error'>('untested');
  const [models, setModels] = useState<AIModel[]>(defaultModels);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState(settings.model || '');

  const canTest = settings.apiKey && settings.baseUrl;
  const canSave = apiStatus === 'success' && (useCustomModel ? !!customModelInput : !!settings.model);

  const handleTest = async () => {
    setTesting(true);
    setTestError(null);
    setApiStatus('untested');
    try {
      const loadedModels = await fetchOpenAIModels(settings.apiKey, settings.baseUrl);
      setModels(loadedModels.length ? loadedModels : defaultModels);
      setApiStatus('success');
      // Если текущая модель не входит в список — сбрасываем
      if (!loadedModels.find(m => m.id === settings.model)) {
        onChange({ ...settings, model: loadedModels[0]?.id || '' });
      }
    } catch (e: any) {
      setApiStatus('error');
      setTestError(e.message);
      setModels(defaultModels);
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    if (name === 'useCustomModel') {
      setUseCustomModel(checked);
      if (checked) {
        setCustomModelInput(settings.model || '');
      } else {
        // Если выключили ручной ввод — сбрасываем на первую модель из списка
        onChange({ ...settings, model: models[0]?.id || '' });
      }
      return;
    }
    if (name === 'customModelInput') {
      setCustomModelInput(value);
      onChange({ ...settings, model: value });
      return;
    }
    onChange({ ...settings, [name]: value });
    if (name === 'apiKey' || name === 'baseUrl') {
      setApiStatus('untested');
      setModels(defaultModels);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSave) onSave({ ...settings, model: useCustomModel ? customModelInput : settings.model });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Настройки ИИ</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{success}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">API Ключ</label>
          <input
            type="password"
            name="apiKey"
            value={settings.apiKey}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="sk-..."
            required
            disabled={loading}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
          <input
            type="text"
            name="baseUrl"
            value={settings.baseUrl}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://api.openai.com/v1"
            required
            disabled={loading}
          />
        </div>
        <div className="mb-4">
          <button
            type="button"
            onClick={handleTest}
            disabled={!canTest || testing || loading}
            className={`px-4 py-2 rounded-md text-white ${
              testing ? 'bg-gray-400' :
              apiStatus === 'success' ? 'bg-green-500' :
              apiStatus === 'error' ? 'bg-red-500' :
              'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {testing ? 'Проверка...' :
              apiStatus === 'success' ? 'Соединение успешно' :
              apiStatus === 'error' ? 'Ошибка соединения' :
              'Проверить соединение'}
          </button>
          {testError && <div className="text-red-500 text-sm mt-2">{testError}</div>}
        </div>
        {apiStatus === 'success' && (
          <>
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Модель</label>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="useCustomModel"
                  name="useCustomModel"
                  checked={useCustomModel}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label htmlFor="useCustomModel" className="ml-2 block text-sm text-gray-700">
                  Ввести модель вручную
                </label>
              </div>
              {useCustomModel ? (
                <input
                  type="text"
                  name="customModelInput"
                  value={customModelInput}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Введите название модели (например, gpt-4-1106-preview)"
                  required
                  disabled={loading}
                />
              ) : (
                <select
                  name="model"
                  value={settings.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={loading}
                >
                  {models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Промпт для названий (по умолчанию)</label>
              <textarea
                name="defaultNamePrompt"
                value={settings.defaultNamePrompt}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите промпт с плейсхолдером {{товар}}"
                required
                disabled={loading}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Промпт для описаний (по умолчанию)</label>
              <textarea
                name="defaultDescriptionPrompt"
                value={settings.defaultDescriptionPrompt}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите промпт с плейсхолдером {{товар}}"
                required
                disabled={loading}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Язык (по умолчанию)</label>
              <select
                name="defaultLanguage"
                value={settings.defaultLanguage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Тон (по умолчанию)</label>
              <select
                name="defaultTone"
                value={settings.defaultTone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="профессиональный">Профессиональный</option>
                <option value="casual">Повседневный</option>
                <option value="friendly">Дружелюбный</option>
                <option value="enthusiastic">Восторженный</option>
                <option value="informative">Информативный</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Максимальное количество токенов</label>
              <input
                type="number"
                name="defaultMaxTokens"
                value={settings.defaultMaxTokens}
                onChange={handleChange}
                min={10}
                max={4000}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                disabled={loading}
              />
            </div>
          </>
        )}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            Сбросить
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading || !canSave}
          >
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
};

export default AISettingsForm; 