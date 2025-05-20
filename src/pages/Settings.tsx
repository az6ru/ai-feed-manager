import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Globe, 
  Bell, 
  Shield, 
  Star, 
  Activity,
  Check
} from 'lucide-react';
import AISettingsForm from '../components/AISettingsForm';
import { AISettings } from '../types/feed';
import { aiService } from '../services/aiService';
import { getAiSettings, upsertAiSettings, getOrCreateProfile } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface SettingItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  active: boolean;
}

const defaultAISettings: AISettings = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  defaultNamePrompt: 'Создай краткое и привлекательное название для товара на основе следующих данных: {{товар}}. Используй не более 60 символов.',
  defaultDescriptionPrompt: 'Создай привлекательное и информативное описание для товара на основе следующих данных: {{товар}}. Описание должно быть от 100 до 200 символов.',
  defaultTitlePrompt: '',
  defaultSummaryPrompt: '',
  defaultLanguage: 'ru',
  defaultTone: 'профессиональный',
  defaultMaxTokens: 150
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  
  const [settings, setSettings] = useState({
    enableAiFeatures: true,
    enableAutomaticExport: false,
    validateBeforeExport: true,
    sendNotifications: true,
    darkMode: false,
    exportFormat: 'xml'
  });
  
  const [exportPresets, setExportPresets] = useState<SettingItem[]>([
    {
      id: 'yandex',
      title: 'Yandex Market',
      description: 'Standard YML format for Yandex Market',
      icon: <Globe className="w-5 h-5 text-yellow-500" />,
      active: true
    },
    {
      id: 'google',
      title: 'Google Merchant',
      description: 'Google Merchant Center compatible format',
      icon: <Globe className="w-5 h-5 text-blue-500" />,
      active: false
    },
    {
      id: 'facebook',
      title: 'Facebook Catalog',
      description: 'Format compatible with Facebook/Instagram shops',
      icon: <Globe className="w-5 h-5 text-indigo-500" />,
      active: false
    },
    {
      id: 'custom',
      title: 'Custom Export',
      description: 'Your custom format with selected fields',
      icon: <Star className="w-5 h-5 text-purple-500" />,
      active: false
    }
  ]);
  
  const { user } = useAuth();
  const [aiSettings, setAiSettings] = useState<AISettings>(defaultAISettings);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setAiLoading(true);
      getOrCreateProfile(user)
        .then(() => getAiSettings(user.id))
        .then(data => {
          if (data) setAiSettings(data);
          setAiError(null);
        })
        .catch(e => setAiError('Ошибка загрузки AI-настроек или профиля'))
        .finally(() => setAiLoading(false));
    }
  }, [user]);

  const handleAISave = async (settings: AISettings) => {
    if (!user) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuccess(null);
    try {
      await getOrCreateProfile(user);
      await upsertAiSettings(user.id, settings);
      setAiSettings(settings);
      setAiSuccess('Настройки успешно сохранены!');
    } catch (e: any) {
      setAiError(e.message || 'Ошибка сохранения AI-настроек');
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiSuccess(null), 3000);
    }
  };
  
  const handleSettingChange = (settingName: keyof typeof settings) => {
    setSettings({
      ...settings,
      [settingName]: !settings[settingName]
    });
  };
  
  const handleExportFormatChange = (format: string) => {
    setSettings({
      ...settings,
      exportFormat: format
    });
  };
  
  const togglePreset = (presetId: string) => {
    setExportPresets(exportPresets.map(preset => ({
      ...preset,
      active: preset.id === presetId ? !preset.active : preset.active
    })));
  };
  
  const handleSaveSettings = () => {
    // Simulate saving settings
    setShowSaveNotification(true);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
      setShowSaveNotification(false);
    }, 3000);
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your preferences and export settings
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('general')}
              className={`
                py-4 px-6 text-sm font-medium border-b-2 focus:outline-none
                ${activeTab === 'general'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`
                py-4 px-6 text-sm font-medium border-b-2 focus:outline-none
                ${activeTab === 'export'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Export
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`
                py-4 px-6 text-sm font-medium border-b-2 focus:outline-none
                ${activeTab === 'ai'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              AI Features
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`
                py-4 px-6 text-sm font-medium border-b-2 focus:outline-none
                ${activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Notifications
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">General Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Theme</h4>
                    <p className="text-sm text-gray-500">Choose your preferred interface theme</p>
                  </div>
                  <div className="flex items-center">
                    <span className={`mr-3 text-sm ${!settings.darkMode ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                      Light
                    </span>
                    <button
                      onClick={() => handleSettingChange('darkMode')}
                      type="button"
                      className={`
                        relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer 
                        transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                        ${settings.darkMode ? 'bg-blue-600' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 
                          transition ease-in-out duration-200
                          ${settings.darkMode ? 'translate-x-5' : 'translate-x-0'}
                        `}
                      />
                    </button>
                    <span className={`ml-3 text-sm ${settings.darkMode ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                      Dark
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Validate before export</h4>
                    <p className="text-sm text-gray-500">Automatically check for errors before exporting</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('validateBeforeExport')}
                    type="button"
                    className={`
                      relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer 
                      transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                      ${settings.validateBeforeExport ? 'bg-blue-600' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 
                        transition ease-in-out duration-200
                        ${settings.validateBeforeExport ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Automatic export</h4>
                    <p className="text-sm text-gray-500">Automatically export changes when saving</p>
                  </div>
                  <button
                    onClick={() => handleSettingChange('enableAutomaticExport')}
                    type="button"
                    className={`
                      relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer 
                      transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                      ${settings.enableAutomaticExport ? 'bg-blue-600' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 
                        transition ease-in-out duration-200
                        ${settings.enableAutomaticExport ? 'translate-x-5' : 'translate-x-0'}
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'export' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Export Settings</h3>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Export Format</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="format-xml"
                      name="export-format"
                      type="radio"
                      checked={settings.exportFormat === 'xml'}
                      onChange={() => handleExportFormatChange('xml')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="format-xml" className="ml-3 text-sm text-gray-700">
                      XML (Standard YML)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="format-json"
                      name="export-format"
                      type="radio"
                      checked={settings.exportFormat === 'json'}
                      onChange={() => handleExportFormatChange('json')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="format-json" className="ml-3 text-sm text-gray-700">
                      JSON
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="format-csv"
                      name="export-format"
                      type="radio"
                      checked={settings.exportFormat === 'csv'}
                      onChange={() => handleExportFormatChange('csv')}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="format-csv" className="ml-3 text-sm text-gray-700">
                      CSV
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Export Presets</h4>
                <p className="text-sm text-gray-500 mb-4">
                  Select the platforms you want to export to
                </p>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {exportPresets.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => togglePreset(preset.id)}
                      className={`
                        relative rounded-lg border p-4 hover:border-blue-200 cursor-pointer
                        ${preset.active ? 'bg-blue-50 border-blue-300' : 'border-gray-200'}
                      `}
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">{preset.icon}</div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-gray-900">{preset.title}</h3>
                            <p className="text-xs text-gray-500">{preset.description}</p>
                          </div>
                        </div>
                        <div className={`
                          h-5 w-5 rounded-full flex items-center justify-center 
                          ${preset.active ? 'bg-blue-600' : 'border border-gray-300'}
                        `}>
                          {preset.active && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">AI Enhancement Features</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Control the AI-powered features for improving your product data
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('enableAiFeatures')}
                  type="button"
                  className={`
                    relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer 
                    transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${settings.enableAiFeatures ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 
                      transition ease-in-out duration-200
                      ${settings.enableAiFeatures ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
              
              {settings.enableAiFeatures && (
                <div className="mt-6">
                  <AISettingsForm
                    settings={aiSettings}
                    onChange={setAiSettings}
                    onSave={handleAISave}
                    loading={aiLoading}
                    error={aiError}
                    success={aiSuccess}
                  />
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-6">
                <ul className="divide-y divide-gray-200">
                  <li className="py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Activity className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Description Enhancement</p>
                        <p className="text-sm text-gray-500">
                          AI will suggest improved product descriptions to increase conversions
                        </p>
                      </div>
                    </div>
                  </li>
                  <li className="py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Shield className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Data Validation</p>
                        <p className="text-sm text-gray-500">
                          AI checks for inconsistencies, errors, and quality issues in your feed
                        </p>
                      </div>
                    </div>
                  </li>
                  <li className="py-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <Star className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">Attribute Suggestions</p>
                        <p className="text-sm text-gray-500">
                          AI will recommend additional product attributes to improve searchability
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Notification Settings</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage how and when you receive notifications
                  </p>
                </div>
                <button
                  onClick={() => handleSettingChange('sendNotifications')}
                  type="button"
                  className={`
                    relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer 
                    transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${settings.sendNotifications ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 
                      transition ease-in-out duration-200
                      ${settings.sendNotifications ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>
              
              <div className="border-t border-gray-200 pt-6">
                <ul className="divide-y divide-gray-200">
                  <li className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Bell className="h-5 w-5 text-blue-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Export Completed</p>
                          <p className="text-sm text-gray-500">
                            Get notified when a feed export is completed
                          </p>
                        </div>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={true}
                          readOnly
                        />
                      </div>
                    </div>
                  </li>
                  <li className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Bell className="h-5 w-5 text-yellow-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Validation Warnings</p>
                          <p className="text-sm text-gray-500">
                            Get notified about issues found during validation
                          </p>
                        </div>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={true}
                          readOnly
                        />
                      </div>
                    </div>
                  </li>
                  <li className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Bell className="h-5 w-5 text-red-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">Export Errors</p>
                          <p className="text-sm text-gray-500">
                            Get notified when an export fails
                          </p>
                        </div>
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          checked={true}
                          readOnly
                        />
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Save className="w-5 h-5 mr-2" />
          Save Settings
        </button>
      </div>
      
      {/* Save notification */}
      {showSaveNotification && (
        <div className="fixed bottom-4 right-4 bg-green-50 text-green-800 px-4 py-3 rounded-md shadow-lg flex items-center">
          <Check className="w-5 h-5 mr-2" />
          Settings saved successfully
        </div>
      )}
    </div>
  );
};

export default Settings;