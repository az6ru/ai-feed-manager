import React, { useState, useEffect } from 'react';
import { Feed } from '../types/feed';
import { analyzeDuplicates, mergeDuplicates, DuplicatesAnalysisResult } from '../services/feedDuplicatesService';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Info, X } from 'lucide-react';

interface DuplicatesAnalyzerProps {
  feed: Feed | null;
  onMergeComplete: (mergedFeed: Feed) => void;
  onCancel: () => void;
  visible?: boolean;
}

const DuplicatesAnalyzer: React.FC<DuplicatesAnalyzerProps> = ({ 
  feed, 
  onMergeComplete, 
  onCancel,
  visible = true
}) => {
  const [analysisResult, setAnalysisResult] = useState<DuplicatesAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // При монтировании компонента запускаем анализ
  useEffect(() => {
    if (feed) {
      const result = analyzeDuplicates(feed);
      setAnalysisResult(result);
      setSelectedAttributes(result.attributesToMerge);
      setIsLoading(false);
    }
  }, [feed]);
  
  // Обработчик изменения выбора атрибутов
  const handleAttributeToggle = (attribute: string) => {
    setSelectedAttributes(prev => 
      prev.includes(attribute)
        ? prev.filter(a => a !== attribute)
        : [...prev, attribute]
    );
  };
  
  // Обработчик объединения дубликатов
  const handleMergeDuplicates = () => {
    if (!feed) return;
    
    const mergedFeed = mergeDuplicates(feed, selectedAttributes);
    onMergeComplete(mergedFeed);
  };
  
  // Обработчик переключения видимости группы
  const toggleGroupExpand = (url: string) => {
    setExpandedGroups(prev => 
      prev.includes(url)
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };
  
  if (!visible || !feed) return null;
  
  // Если анализ еще не завершен, показываем индикатор загрузки
  if (isLoading || !analysisResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full">
          <div className="text-center py-8">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900">Анализ дубликатов товаров...</h3>
          </div>
        </div>
      </div>
    );
  }
  
  // Если дубликатов не найдено
  if (analysisResult.groupsCount === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Анализ дубликатов</h2>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-6">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-md font-medium text-blue-700">Дубликаты не обнаружены</h3>
                <p className="text-sm text-blue-600 mt-1">
                  В данном фиде не найдено товаров с одинаковыми URL. 
                  Все товары уникальны и не требуют объединения.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Анализ дубликатов товаров</h2>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Сводная информация */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 mt-0.5" />
            <div>
              <h3 className="text-md font-medium text-yellow-700">Найдены дубликаты товаров</h3>
              <p className="text-sm text-yellow-600 mt-1">
                В фиде обнаружено {analysisResult.groupsCount} групп товаров с одинаковыми URL (всего {analysisResult.originalProductCount} товаров). 
                После объединения в фиде останется {analysisResult.mergedProductsCount} товаров.
              </p>
            </div>
          </div>
        </div>
        
        {/* Выбор атрибутов для объединения */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Выберите атрибуты для объединения:</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-md">
            {Object.keys(analysisResult.uniqueAttributes).map(attribute => (
              <div key={attribute} className="flex items-center">
                <input
                  type="checkbox"
                  id={`attr-${attribute}`}
                  checked={selectedAttributes.includes(attribute)}
                  onChange={() => handleAttributeToggle(attribute)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor={`attr-${attribute}`} className="ml-2 text-sm text-gray-700">
                  {attribute} ({analysisResult.uniqueAttributes[attribute].size} значений)
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Список групп дубликатов */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Группы дубликатов:</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analysisResult.productGroups.map((group, index) => (
              <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                <div 
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
                  onClick={() => toggleGroupExpand(group.url)}
                >
                  <div className="flex-grow">
                    <div className="font-medium">{group.baseProduct.name}</div>
                    <div className="text-sm text-gray-500">
                      <span className="mr-3">URL: {group.url}</span>
                      <span className="mr-3">Вариантов: {group.totalVariants}</span>
                      {group.sizes.length > 0 && (
                        <span className="mr-3">
                          Размеры: {group.sizes.map(size => 
                            typeof size === 'object' ? JSON.stringify(size) : String(size)
                          ).join(', ')}
                        </span>
                      )}
                      {group.colors.length > 0 && (
                        <span>
                          Цвета: {group.colors.map(color => 
                            typeof color === 'object' ? JSON.stringify(color) : String(color)
                          ).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {expandedGroups.includes(group.url) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
                
                {expandedGroups.includes(group.url) && (
                  <div className="p-4">
                    <div className="text-sm text-gray-700 mb-3">Варианты товара:</div>
                    <div className="space-y-2">
                      {group.variants.map((variant, vIndex) => (
                        <div key={vIndex} className="border border-gray-100 p-2 rounded-md bg-gray-50">
                          <div className="text-sm font-medium">{variant.name}</div>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            {variant.attributes
                              .filter(attr => selectedAttributes.includes(attr.name))
                              .map((attr, aIndex) => {
                                // Преобразуем значение атрибута в строку
                                let attrValue: string;
                                if (typeof attr.value === 'object' && attr.value !== null) {
                                  try {
                                    const objValue = attr.value as Record<string, any>;
                                    if (objValue.value !== undefined) {
                                      attrValue = String(objValue.value);
                                    } else if (objValue.text !== undefined) {
                                      attrValue = String(objValue.text);
                                    } else {
                                      attrValue = JSON.stringify(objValue);
                                    }
                                  } catch (e) {
                                    attrValue = 'Объект';
                                  }
                                } else {
                                  attrValue = typeof attr.value === 'string' ? attr.value : String(attr.value);
                                }
                                
                                return (
                                  <div key={aIndex} className="text-xs">
                                    <span className="text-gray-500">{attr.name}:</span> {attrValue}
                                  </div>
                                );
                              })
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Кнопки действий */}
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleMergeDuplicates}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Объединить дубликаты
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicatesAnalyzer; 