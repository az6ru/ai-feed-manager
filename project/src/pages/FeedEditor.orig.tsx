import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, ChevronDown, Check, X, Search, Filter, Download, 
  Save, Edit, Copy, Plus, Settings, Trash2, Link as LinkIcon, 
  Image, CheckCircle, XCircle, CheckSquare, Sparkles, RefreshCw, Globe, 
  ExternalLink, Unlink, ChevronRight, ChevronLeft, Zap, Info
} from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { Product, Feed } from '../types/feed';
import { generateYmlFromFeed } from '../services/ymlParser';
import { 
  publishFeed, 
  getFeedUrl, 
  isFeedApiAvailable, 
  updatePublishedFeed,
  deletePublishedFeed 
} from '../services/feedApiService';
import AIBulkGeneration from '../components/AIBulkGeneration';
import FeedAISettingsForm from '../components/FeedAISettings';
// Импортирую parseFeedFromXml
import { parseFeedFromXml } from '../services/ymlParser';
import { fetchFeedContent } from '../services/proxyService';
import Modal from '../components/layout/Modal';

// CSS для кастомного скроллбара
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background-color: #f1f1f1;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #c1c1c1;
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #a1a1a1;
  }

  /* Для Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #c1c1c1 #f1f1f1;
  }
`;

// --- Функция сравнения товаров ---
interface ProductDiff {
  id: string;
  type: 'changed' | 'new';
  changedFields?: Record<string, { old: any; new: any }>;
  oldProduct?: Product;
  newProduct: Product;
}
function diffProducts(
  oldProducts: Product[],
  newProducts: Product[],
  options?: UpdateOptions,
  mergedIdMap?: Record<string, string>
): ProductDiff[] {
  const oldMap: Record<string, Product> = Object.fromEntries(oldProducts.map((p) => [p.id, p]));
  const newMap: Record<string, Product> = Object.fromEntries(newProducts.map((p) => [p.id, p]));
  const diffs: ProductDiff[] = [];
  const opts = options || defaultUpdateOptions;

  // Новые товары
  for (const id in newMap) {
    // Если игнорируем объединённые id и id есть в mergedIdMap — не считаем новым
    if (opts.ignoreMerged && mergedIdMap && mergedIdMap[id]) continue;
    if (!oldMap[id]) {
      if (opts.addNew) {
        diffs.push({ id, type: 'new', newProduct: newMap[id] });
      }
      continue;
    }
    const oldP = oldMap[id];
    const newP = newMap[id];
    const changedFields: Record<string, { old: any; new: any }> = {};
    if (opts.price && oldP.price !== newP.price) changedFields.price = { old: oldP.price, new: newP.price };
    if (opts.available && Boolean(oldP.available) !== Boolean(newP.available)) changedFields.available = { old: oldP.available, new: newP.available };
    if (opts.name && oldP.name !== newP.name) changedFields.name = { old: oldP.name, new: newP.name };
    if (opts.description && oldP.description !== newP.description) changedFields.description = { old: oldP.description, new: newP.description };
    if (opts.attributes) {
      // Сравниваем только по именам и значениям атрибутов
      const oldAttrs = (oldP.attributes || []).map(a => `${a.name}:${a.value}`).sort().join('|');
      const newAttrs = (newP.attributes || []).map(a => `${a.name}:${a.value}`).sort().join('|');
      if (oldAttrs !== newAttrs) {
        changedFields.attributes = { old: oldP.attributes, new: newP.attributes };
      }
    }
    if (Object.keys(changedFields).length > 0) {
      diffs.push({ id, type: 'changed', changedFields, oldProduct: oldP, newProduct: newP });
    }
  }
  return diffs;
}

// --- Модальное окно отличий с выбором полей для обновления ---
interface FeedUpdateDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffs: ProductDiff[];
  onApply: () => void;
  onFieldSelectionChange: (sel: FieldSelection) => void;
  fieldSelection: FieldSelection;
}

interface FieldSelection {
  [productId: string]: {
    [field: string]: boolean;
  };
}

function FeedUpdateDiffModal({ isOpen, onClose, diffs, onApply, onFieldSelectionChange, fieldSelection }: FeedUpdateDiffModalProps) {
  // Обработка клика по чекбоксу
  const handleCheckbox = (productId: string, field: string, checked: boolean) => {
    onFieldSelectionChange({
      ...fieldSelection,
      [productId]: {
        ...fieldSelection[productId],
        [field]: checked
      }
    });
  };

  // Кнопка "Применить все"
  const handleApplyAll = () => {
    const newSelection: FieldSelection = {};
    diffs.forEach(diff => {
      if (diff.type === 'changed' && diff.changedFields) {
        newSelection[diff.id] = {};
        Object.keys(diff.changedFields).forEach(field => {
          newSelection[diff.id][field] = true;
        });
      }
    });
    onFieldSelectionChange(newSelection);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Обновление фида: найдено отличие" size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Отмена</button>
          <button onClick={handleApplyAll} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">Применить все</button>
          <button onClick={onApply} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Применить обновления</button>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {diffs.length === 0 ? (
          <div className="text-green-700">Нет отличий — все данные актуальны.</div>
        ) : (
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Тип</th>
                <th className="border px-2 py-1">Изменения (выберите, что обновить)</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map(diff => (
                <tr key={diff.id}>
                  <td className="border px-2 py-1 font-mono">{diff.id}</td>
                  <td className="border px-2 py-1">
                    {diff.type === 'new' ? <span className="text-green-700">Новый</span> : 'Изменён'}
                  </td>
                  <td className="border px-2 py-1">
                    {diff.type === 'new' ? (
                      <span>Будет добавлен товар: <b>{diff.newProduct.name}</b></span>
                    ) : (
                      <ul className="list-disc pl-4">
                        {diff.changedFields && Object.entries(diff.changedFields).map(([field, {old, new: newVal}]) => (
                          <li key={field} className="mb-1">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!fieldSelection[diff.id]?.[field]}
                                onChange={e => handleCheckbox(diff.id, field, e.target.checked)}
                              />
                              <span><b>{field}:</b> <span className="text-gray-500 line-through">{String(old)}</span> → <span className="text-blue-700">{String(newVal)}</span></span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

// --- Модалка массовых опций для обновления фида ---
interface UpdateOptions {
  price: boolean;
  available: boolean;
  name: boolean;
  description: boolean;
  attributes: boolean;
  addNew: boolean;
  ignoreMerged: boolean;
}

const defaultUpdateOptions: UpdateOptions = {
  price: true,
  available: true,
  name: false,
  description: false,
  attributes: true,
  addNew: true,
  ignoreMerged: true,
};

function UpdateOptionsModal({ isOpen, onClose, onApply, options, setOptions }: {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  options: UpdateOptions;
  setOptions: (opts: UpdateOptions) => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Массовые опции обновления фида" size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Отмена</button>
          <button onClick={onApply} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Далее</button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={options.price} onChange={e => setOptions({ ...options, price: e.target.checked })} />
          <span>Обновлять цены</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={options.available} onChange={e => setOptions({ ...options, available: e.target.checked })} />
          <span>Обновлять наличие</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={options.name} onChange={e => setOptions({ ...options, name: e.target.checked })} />
          <span>Обновлять названия</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={options.description} onChange={e => setOptions({ ...options, description: e.target.checked })} />
          <span>Обновлять описания</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={options.attributes} onChange={e => setOptions({ ...options, attributes: e.target.checked })} />
          <span>Обновлять атрибуты (размеры, цвета и т.д.)</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={options.addNew} onChange={e => setOptions({ ...options, addNew: e.target.checked })} />
          <span>Добавлять новые товары</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={options.ignoreMerged} onChange={e => setOptions({ ...options, ignoreMerged: e.target.checked })} />
          <span>Игнорировать id, которые были объединены (не считать их новыми)</span>
        </label>
      </div>
    </Modal>
  );
}

const FeedEditor = () => {
  const { feedId } = useParams<{ feedId: string }>();
  const navigate = useNavigate();
  const { feeds, currentFeed, setCurrentFeed, updateFeed, updateProducts, importFeedFromXml, importLargeFeedFromXml } = useFeed();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [availabilityFilter, setAvailabilityFilter] = useState<boolean | null>(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkAvailability, setBulkAvailability] = useState<boolean | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [showAIGenerationModal, setShowAIGenerationModal] = useState(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [publishingFeed, setPublishingFeed] = useState(false);
  const [updatingFeed, setUpdatingFeed] = useState(false);
  const [deletingFeed, setDeletingFeed] = useState(false);
  const [feedPublicUrl, setFeedPublicUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPublishConfirmModal, setShowPublishConfirmModal] = useState(false);
  const [bulkIncludeInExport, setBulkIncludeInExport] = useState<boolean | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [exportFilter, setExportFilter] = useState<boolean | null>(null);
  const [attributeFilters, setAttributeFilters] = useState<{ [attrName: string]: string[] }>({});
  const [collapsedSections, setCollapsedSections] = useState<{[key: string]: boolean}>(() => {
    // Инициализируем базовые секции как свернутые
    const defaultCollapsed: {[key: string]: boolean} = {
      availability: true,
      vendor: true,
      export: true,
      discount: true,
    };
    
    // Добавляем динамические секции для атрибутов (если есть currentFeed)
    if (currentFeed) {
      const allAttrNames = new Set<string>();
      currentFeed.products.forEach(product => {
        (product.attributes || []).forEach(attr => {
          allAttrNames.add(attr.name);
        });
      });
      
      allAttrNames.forEach(attrName => {
        const sectionKey = `attr_${attrName}`;
        defaultCollapsed[sectionKey] = true;
      });
    }
    
    return defaultCollapsed;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffs, setDiffs] = useState<ProductDiff[]>([]);
  const [pendingParsedFeed, setPendingParsedFeed] = useState<Feed | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [fieldSelection, setFieldSelection] = useState<FieldSelection>({});
  const [showUpdateOptionsModal, setShowUpdateOptionsModal] = useState(false);
  const [updateOptions, setUpdateOptions] = useState<UpdateOptions>(defaultUpdateOptions);
  const [showBrandStatsModal, setShowBrandStatsModal] = useState(false);
  
  // ВСЕ useEffect вместе в начале компонента
  // Эффект 1: Загружаем URL фида при монтировании компонента, если фид уже опубликован
  useEffect(() => {
    if (currentFeed?.isPublished && currentFeed?.publishedUrl) {
      setFeedPublicUrl(currentFeed.publishedUrl);
    }
  }, [currentFeed]);
  
  // Эффект 2: Загрузка фида по ID
  useEffect(() => {
    if (feedId) {
      // Find the feed if it exists
      const feed = feeds.find(f => f.id === feedId);
      
      if (feed) {
        setCurrentFeed(feedId);
      } else {
        // Feed not found, redirect to dashboard
        navigate('/');
      }
    }
  }, [feedId, feeds, setCurrentFeed, navigate]);
  
  // Эффект 3: Сброс выделения при изменении фильтров
  useEffect(() => {
    setSelectAllPages(false);
    setSelectedProducts([]);
  }, [searchQuery, selectedVendors, exportFilter, attributeFilters, availabilityFilter]);
  
  const productsPerPage = 10;
  
  // Мемоизированные значения
  const uniqueVendors = useMemo(() => {
    if (!currentFeed) return [];
    const vendors = currentFeed.products.map(p => p.vendor).filter(Boolean);
    return Array.from(new Set(vendors)).sort();
  }, [currentFeed]);
  
  const attributeOptions = useMemo(() => {
    if (!currentFeed) return {};
    const options: { [attrName: string]: Set<string> } = {};
    currentFeed.products.forEach(product => {
      (product.attributes || []).forEach(attr => {
        if (!options[attr.name]) options[attr.name] = new Set();
        options[attr.name].add(attr.value);
      });
    });
    return Object.fromEntries(
      Object.entries(options).map(([name, set]) => [name, Array.from(set).sort()])
    );
  }, [currentFeed]);
  
  const filteredProducts = useMemo(() => {
    if (!currentFeed) return [];
    return currentFeed.products.filter(product => {
      const query = searchQuery.trim().toLowerCase();
      if (!query && availabilityFilter === null && selectedVendors.length === 0 && exportFilter === null && Object.values(attributeFilters).every(arr => arr.length === 0)) return true;
      // Поиск по id (точное и частичное совпадение)
      const matchesId = product.id && product.id.toLowerCase().includes(query);
      // Поиск по vendor
      const matchesVendorSearch = product.vendor && product.vendor.toLowerCase().includes(query);
      // Поиск по url
      const matchesUrl = (product.url && product.url.toLowerCase().includes(query)) ||
                        (product.generatedUrl && product.generatedUrl.toLowerCase().includes(query));
      // Поиск по name, vendorCode
      const matchesName = product.name && product.name.toLowerCase().includes(query);
      const matchesVendorCode = product.vendorCode && product.vendorCode.toLowerCase().includes(query);
      const matchesSearch = !query || matchesId || matchesVendorSearch || matchesUrl || matchesName || matchesVendorCode;
      // Фильтр по доступности
      const matchesAvailability = availabilityFilter === null || product.available === availabilityFilter;
      // Фильтр по vendor (множественный выбор)
      const matchesVendor = selectedVendors.length === 0 || (product.vendor && selectedVendors.includes(product.vendor));
      // Фильтр по участию в выгрузке
      const matchesExport = exportFilter === null || product.includeInExport === exportFilter;
      // Фильтр по скидке
      let matchesDiscount = true;
      const discountFilter = attributeFilters['__discount']?.[0] || 'all';
      if (discountFilter === 'discount') matchesDiscount = product.oldPrice != null;
      if (discountFilter === 'no_discount') matchesDiscount = product.oldPrice == null;
      // Универсальная фильтрация по атрибутам
      const matchesAttributes = Object.entries(attributeFilters)
        .filter(([attrName]) => attrName !== '__discount')
        .every(([attrName, selectedValues]) => {
          if (!selectedValues.length) return true;
          const attr = (product.attributes || []).find(a => a.name === attrName);
          return attr && selectedValues.includes(attr.value);
        });
      return matchesSearch && matchesAvailability && matchesVendor && matchesExport && matchesDiscount && matchesAttributes;
    });
  }, [currentFeed, searchQuery, availabilityFilter, selectedVendors, exportFilter, attributeFilters]);
  
  // Если нет currentFeed, показываем лоадер
  if (!currentFeed) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-4 text-center">
          <p className="text-lg text-gray-600">Loading feed data...</p>
        </div>
      </div>
    );
  }
  
  // Перемещаю handleSort сюда
  const handleSort = (column: keyof Product) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valueA = a[sortColumn];
    let valueB = b[sortColumn];
    
    // Handle undefined or null values
    if (valueA === undefined || valueA === null) valueA = '';
    if (valueB === undefined || valueB === null) valueB = '';
    
    // Convert to string for comparison
    const strA = String(valueA).toLowerCase();
    const strB = String(valueB).toLowerCase();
    
    if (sortDirection === 'asc') {
      return strA.localeCompare(strB);
    } else {
      return strB.localeCompare(strA);
    }
  });
  
  // Paginate products
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = sortedProducts.slice(
    startIndex, 
    startIndex + productsPerPage
  );
  
  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };
  
  const handleSelectAllProducts = () => {
    if (selectedProducts.length === paginatedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(paginatedProducts.map(p => p.id));
    }
  };
  
  // Модифицирую функцию массового выбора товаров с учетом фильтрации
  const handleSelectAllPagesProducts = () => {
    if (selectAllPages) {
      // Если все страницы уже выбраны, снимаем выбор
      setSelectedProducts([]);
      setSelectAllPages(false);
    } else {
      // Выбираем все отфильтрованные продукты
      setSelectedProducts(filteredProducts.map(p => p.id));
      setSelectAllPages(true);
    }
  };
  
  const handleEditProduct = (productId: string) => {
    navigate(`/feeds/${feedId}/products/${productId}`);
  };
  
  const handleDeleteSelected = () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Удалить выбранные товары (${selectedProducts.length})?`)) return;
    // Удаляем товары из фида
    const newProducts = currentFeed.products.filter(p => !selectedProducts.includes(p.id));
    updateFeed(currentFeed.id, { products: newProducts });
    setSelectedProducts([]);
  };
  
  const handleBulkEdit = () => {
    if (selectedProducts.length === 0) return;
    const updateData: any = {};
    if (bulkAvailability !== null) updateData.available = bulkAvailability;
    if (bulkIncludeInExport !== null) updateData.includeInExport = bulkIncludeInExport;
    if (Object.keys(updateData).length > 0) {
      updateProducts(feedId!, selectedProducts, updateData);
    }
    setShowBulkEditModal(false);
    setSelectedProducts([]);
    setBulkAvailability(null);
    setBulkIncludeInExport(null);
  };
  
  const handleExportFeed = () => {
    try {
      const xmlContent = generateYmlFromFeed(currentFeed);
      
      // Create a blob and download the file
      const blob = new Blob([xmlContent], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentFeed.name.replace(/\s+/g, '_')}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Обновляем дату изменения фида
      updateFeed(currentFeed.id, {
        createdAt: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Error exporting feed:', err);
      // In a real application, we'd show an error toast/notification
    }
  };
  
  // Функция для публикации фида через API
  const handlePublishFeed = async () => {
    if (!currentFeed) return;
    
    setPublishingFeed(true);
    
    try {
      // Проверяем доступность API
      const isApiAvailable = await isFeedApiAvailable();
      
      if (!isApiAvailable) {
        alert('API-сервер фидов недоступен. Убедитесь, что сервер запущен.');
        setPublishingFeed(false);
        return;
      }
      
      // Публикуем фид
      const url = await publishFeed(currentFeed);
      
      // Обновляем URL в состоянии
      setFeedPublicUrl(url);
      
      // Обновляем дату изменения фида и статус публикации
      updateFeed(currentFeed.id, {
        createdAt: new Date().toISOString(),
        isPublished: true,
        publishedUrl: url
      });
      
      // Показываем уведомление об успешной публикации
      alert(`Фид успешно опубликован. Ссылка доступна для копирования.`);
      
    } catch (err) {
      console.error('Error publishing feed:', err);
      alert(`Не удалось опубликовать фид: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setPublishingFeed(false);
    }
  };
  
  // Функция для обновления опубликованного фида
  const handleUpdatePublishedFeed = async () => {
    if (!currentFeed) return;
    
    // Проверяем, действительно ли фид опубликован
    if (!currentFeed.isPublished || !currentFeed.publishedUrl) {
      alert('Фид не опубликован. Сначала опубликуйте фид.');
      return;
    }
    
    setUpdatingFeed(true);
    
    try {
      // Проверяем доступность API
      const isApiAvailable = await isFeedApiAvailable();
      
      if (!isApiAvailable) {
        alert('API-сервер фидов недоступен. Убедитесь, что сервер запущен.');
        setUpdatingFeed(false);
        return;
      }
      
      console.log('Отправка запроса на обновление фида:', currentFeed.id);
      
      // Обновляем фид с отладочной информацией
      const url = await updatePublishedFeed(currentFeed);
      console.log('Ответ от сервера при обновлении:', url);
      
      // Обновляем URL в состоянии
      setFeedPublicUrl(url);
      
      // Обновляем только дату изменения фида, сохраняя настройки AI и другие важные свойства
      updateFeed(currentFeed.id, {
        dateModified: new Date().toISOString(),
        // Явно сохраняем текущие настройки AI
        aiSettings: currentFeed.aiSettings
      });
      
      // Показываем уведомление об успешном обновлении
      alert(`Фид успешно обновлен.`);
      
    } catch (err) {
      console.error('Error updating feed:', err);
      alert(`Не удалось обновить фид: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setUpdatingFeed(false);
    }
  };
  
  // Функция для удаления публикации фида
  const handleDeletePublishedFeed = async () => {
    if (!currentFeed) return;
    
    // Запрашиваем подтверждение
    if (!confirm('Вы уверены, что хотите удалить публикацию фида? Фид больше не будет доступен по публичной ссылке.')) {
      return;
    }
    
    setDeletingFeed(true);
    
    try {
      // Проверяем доступность API
      const isApiAvailable = await isFeedApiAvailable();
      
      if (!isApiAvailable) {
        alert('API-сервер фидов недоступен. Убедитесь, что сервер запущен.');
        setDeletingFeed(false);
        return;
      }
      
      // Удаляем публикацию фида
      await deletePublishedFeed(currentFeed.id);
      
      // Очищаем URL в состоянии
      setFeedPublicUrl('');
      
      // Обновляем статус публикации
      updateFeed(currentFeed.id, {
        isPublished: false,
        publishedUrl: undefined
      });
      
      // Показываем уведомление об успешном удалении
      alert(`Публикация фида успешно удалена.`);
      
    } catch (err) {
      console.error('Error deleting published feed:', err);
      alert(`Не удалось удалить публикацию фида: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setDeletingFeed(false);
    }
  };
  
  // Функция для копирования URL фида в буфер обмена
  const handleCopyFeedUrl = () => {
    if (!feedPublicUrl) return;
    
    navigator.clipboard.writeText(feedPublicUrl)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Не удалось скопировать URL:', err);
      });
  };
  
  // Обработчик для открытия модального окна с изображением
  const handleOpenImageModal = (imageUrl: string, product: Product) => {
    const imageIndex = product.picture?.indexOf(imageUrl) ?? 0;
    setCurrentModalImageIndex(imageIndex);
    setCurrentImage(imageUrl);
    setCurrentProduct(product);
    setShowImageModal(true);
  };

  // Обработчик для закрытия модального окна с изображением
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setCurrentImage('');
    setCurrentProduct(null);
  };

  // Функция для навигации между изображениями в модальном окне
  const navigateModalImages = (direction: 'prev' | 'next') => {
    if (!currentProduct || !currentProduct.picture || currentProduct.picture.length <= 1) return;

    let newIndex = currentModalImageIndex;
    if (direction === 'next') {
      newIndex = (currentModalImageIndex + 1) % currentProduct.picture.length;
    } else {
      newIndex = (currentModalImageIndex - 1 + currentProduct.picture.length) % currentProduct.picture.length;
    }
    
    setCurrentModalImageIndex(newIndex);
    setCurrentImage(currentProduct.picture[newIndex]);
  };

  // Функция для показа миниатюры изображения
  const renderProductImage = (product: Product) => {
    if (product.picture && product.picture.length > 0) {
      const mainImage = product.picture[0];
      return (
        <div className="flex items-center">
          <div 
            className="w-12 h-12 bg-gray-100 rounded overflow-hidden cursor-pointer relative group"
            onClick={(e) => {
              e.stopPropagation(); // Предотвращаем всплытие события клика
              handleOpenImageModal(mainImage, product);
            }}
          >
            <img 
              src={mainImage} 
              alt={product.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNNDMuNzUgNTguNUw1NC4yNSA2OUg2Mi4yNUw0OC43NSA0OS41TDQzLjc1IDU4LjVaIiBmaWxsPSIjOTRBM0IzIi8+PHBhdGggZD0iTTMxIDY5TDQzLjc1IDQ3LjVMNTYuNSA2OUgzMVoiIGZpbGw9IiM5NEEzQjMiLz48Y2lyY2xlIGN4PSI2NCIgY3k9IjM2IiByPSI1IiBmaWxsPSIjOTRBM0IzIi8+PC9zdmc+';
              }}
            />
            {product.picture.length > 1 && (
              <div 
                className="absolute bottom-0 right-0 p-0.5 bg-gray-800 text-white text-xs rounded-tl-md"
                onClick={(e) => e.stopPropagation()} // Предотвращаем всплытие события клика
              >
                +{product.picture.length - 1}
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
              <div className="text-transparent group-hover:text-white transform scale-0 group-hover:scale-100 transition-transform">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">
          <Image className="w-6 h-6" />
        </div>
      );
    }
  };
  
  // Оптимизированная панель инструментов с компактным интерфейсом
  const renderToolbar = () => (
    <div className="bg-white p-2 rounded mb-2">
      <div className="flex flex-row justify-end items-center gap-1">
        {/* Минималистичные action-кнопки */}
        <button
          onClick={() => setShowAISettingsModal(true)}
          className="p-2 hover:bg-gray-100 rounded transition"
          title="Настройки AI"
        >
          <Settings className="h-5 w-5 text-gray-500" />
        </button>
        <button
          onClick={() => setShowAIGenerationModal(true)}
          className="p-2 hover:bg-purple-50 rounded transition"
          title="AI-генерация"
        >
          <Sparkles className="h-5 w-5 text-purple-500" />
        </button>
        <button
          onClick={handleExportFeed}
          className="p-2 hover:bg-green-50 rounded transition"
          title="Экспорт фида"
        >
          <Download className="h-5 w-5 text-green-600" />
        </button>
        {currentFeed?.isPublished ? (
          <>
            <button
              onClick={handleUpdatePublishedFeed}
              disabled={updatingFeed}
              className="p-2 hover:bg-green-50 rounded transition disabled:opacity-50"
              title="Обновить публикацию"
            >
              <RefreshCw className={`h-5 w-5 ${updatingFeed ? 'animate-spin text-gray-400' : 'text-green-600'}`} />
            </button>
            <button
              onClick={handleDeletePublishedFeed}
              disabled={deletingFeed}
              className="p-2 hover:bg-red-50 rounded transition disabled:opacity-50"
              title="Отменить публикацию"
            >
              <Unlink className={`h-5 w-5 ${deletingFeed ? 'animate-spin text-gray-400' : 'text-red-500'}`} />
            </button>
          </>
        ) : (
          <button
            onClick={handlePublishFeed}
            disabled={publishingFeed}
            className="p-2 hover:bg-blue-50 rounded transition disabled:opacity-50"
            title="Опубликовать фид"
          >
            {publishingFeed ? (
              <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <Globe className="h-5 w-5 text-blue-600" />
            )}
          </button>
        )}
        <button
          onClick={reloadFeedData}
          className="p-2 hover:bg-gray-100 rounded transition"
          title="Обновить данные фида"
        >
          <RefreshCw className="h-5 w-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
  
  const renderAIModals = () => (
    <>
      {showAISettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 overflow-y-auto pt-10 pb-10">
          <div className="relative max-w-2xl w-full mx-4 bg-white rounded-xl shadow-xl p-0">
            {/* Кнопка закрытия */}
            <button
              onClick={() => setShowAISettingsModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 focus:outline-none z-10"
              title="Закрыть"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/></svg>
            </button>
            <div className="p-6">
              <FeedAISettingsForm 
                feed={currentFeed}
                onUpdate={(updatedFeed) => {
                  if (!updatedFeed.aiSettings) {
                    alert('Ошибка при сохранении настроек AI. Проверьте консоль для деталей.');
                    setShowAISettingsModal(false);
                    return;
                  }
                  updateFeed(feedId!, { 
                    aiSettings: updatedFeed.aiSettings,
                    metadata: updatedFeed.metadata
                  });
                  setShowAISettingsModal(false);
                }}
                onCancel={() => setShowAISettingsModal(false)}
              />
            </div>
          </div>
        </div>
      )}
      
      {showAIGenerationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="max-w-3xl w-full mx-4">
            <AIBulkGeneration 
              feed={currentFeed}
              selectedProductIds={selectedProducts}
              onComplete={(updatedFeed, results) => {
                console.log('Завершена генерация AI, обновляем продукты');
                console.log('Количество результатов генерации:', results.length);
                console.log('Настройки AI в обновленном фиде:', updatedFeed.aiSettings);
                
                // Сохраняем продукты и настройки AI
                updateFeed(feedId!, { 
                  products: updatedFeed.products,
                  aiSettings: updatedFeed.aiSettings // Сохраняем настройки AI
                });
                
                setShowAIGenerationModal(false);
              }}
              onCancel={() => setShowAIGenerationModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
  
  // Функция для переключения статуса участия в выгрузке
  const handleToggleExportStatus = (productId: string) => {
    const product = currentFeed.products.find(p => p.id === productId);
    if (product) {
      updateProducts(currentFeed.id, [productId], { includeInExport: !product.includeInExport });
    }
  };

  // Функция для генерации URL товара
  const handleGenerateUrl = (productId: string) => {
    const product = currentFeed.products.find(p => p.id === productId);
    if (product) {
      // Формируем URL на основе названия товара и артикула
      const baseUrl = "https://example.com/catalog/";
      const slug = product.name
        .toLowerCase()
        .replace(/[^\w\sа-яё]/g, '') // Удаляем спец. символы
        .replace(/\s+/g, '-') // Заменяем пробелы на дефисы
        + (product.vendorCode ? `-${product.vendorCode}` : '')
        + `-id${product.id}`;
      
      const generatedUrl = baseUrl + slug;
      updateProducts(currentFeed.id, [productId], { generatedUrl });
    }
  };

  // Функция для генерации URL для всех выбранных товаров
  const handleBulkGenerateUrls = () => {
    if (selectedProducts.length === 0) return;
    
    selectedProducts.forEach(productId => {
      handleGenerateUrl(productId);
    });
    
    // Информируем пользователя об успешной генерации
    alert(`URL сгенерированы для ${selectedProducts.length} товаров`);
  };

  // Функция для массового включения/исключения из выгрузки
  const handleBulkExportToggle = (includeInExport: boolean) => {
    if (selectedProducts.length === 0) return;
    
    updateProducts(feedId!, selectedProducts, { includeInExport });
    
    // Информируем пользователя
    alert(`${selectedProducts.length} товаров ${includeInExport ? 'включены в' : 'исключены из'} выгрузку`);
  };
  
  // Переключатель для сворачивания/разворачивания секций
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Рендер сайдбара с фильтрами в виде аккордеона
  const renderSidebarFilters = () => (
    <div className="space-y-6">
      {/* Секция Доступность */}
      <div>
        <div 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
          onClick={() => toggleSection('availability')}
        >
          <span className="text-sm font-semibold">Доступность</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${collapsedSections.availability ? '' : 'transform rotate-180'}`} />
        </div>
        {!collapsedSections.availability && (
          <div className="flex flex-col gap-2 pl-1">
            <label className="flex items-center cursor-pointer gap-2">
              <input type="radio" className="h-4 w-4 text-blue-600" checked={availabilityFilter === null} onChange={() => setAvailabilityFilter(null)} />
              <span className="text-sm">Все</span>
            </label>
            <label className="flex items-center cursor-pointer gap-2">
              <input type="radio" className="h-4 w-4 text-blue-600" checked={availabilityFilter === true} onChange={() => setAvailabilityFilter(true)} />
              <span className="text-sm">В наличии</span>
            </label>
            <label className="flex items-center cursor-pointer gap-2">
              <input type="radio" className="h-4 w-4 text-blue-600" checked={availabilityFilter === false} onChange={() => setAvailabilityFilter(false)} />
              <span className="text-sm">Отсутствует</span>
            </label>
          </div>
        )}
      </div>
      {/* Секция В выгрузке */}
      <div>
        <div 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
          onClick={() => toggleSection('export')}
        >
          <span className="text-sm font-semibold">В выгрузке</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${collapsedSections.export ? '' : 'transform rotate-180'}`} />
        </div>
        {!collapsedSections.export && (
          <div className="flex flex-col gap-2 pl-1">
            <label className="flex items-center cursor-pointer gap-2">
              <input type="radio" className="h-4 w-4 text-blue-600" checked={exportFilter === null} onChange={() => setExportFilter(null)} />
              <span className="text-sm">Все</span>
            </label>
            <label className="flex items-center cursor-pointer gap-2">
              <input type="radio" className="h-4 w-4 text-blue-600" checked={exportFilter === true} onChange={() => setExportFilter(true)} />
              <span className="text-sm">Включён</span>
            </label>
            <label className="flex items-center cursor-pointer gap-2">
              <input type="radio" className="h-4 w-4 text-blue-600" checked={exportFilter === false} onChange={() => setExportFilter(false)} />
              <span className="text-sm">Исключён</span>
            </label>
          </div>
        )}
      </div>
      {/* Секция Производитель с поиском */}
      <div>
        <div 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
          onClick={() => toggleSection('vendor')}
        >
          <span className="text-sm font-semibold">Производитель</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${collapsedSections.vendor ? '' : 'transform rotate-180'}`} />
        </div>
        {!collapsedSections.vendor && (
          <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-2 pl-1">
            <input
              type="text"
              placeholder="Поиск бренда..."
              className="mb-2 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={vendorSearch}
              onChange={e => setVendorSearch(e.target.value)}
              onPaste={e => {
                const pasted = e.clipboardData.getData('text');
                // Разбиваем по \n, запятым и точкам с запятой
                const items = pasted.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
                if (items.length > 1) {
                  // Получаем все уникальные бренды из списка
                  const lowerItems = items.map(i => i.toLowerCase());
                  setSelectedVendors(prev => {
                    const allVendors = uniqueVendors;
                    const toSelect = allVendors.filter(v => v && lowerItems.includes(v.toLowerCase())) as string[];
                    return Array.from(new Set([...prev, ...toSelect]));
                  });
                  setVendorSearch('');
                  e.preventDefault();
                }
              }}
            />
            {uniqueVendors.filter(vendor =>
              !vendorSearch || (vendor ?? '').toLowerCase().includes(vendorSearch.toLowerCase())
            ).map(vendor => {
              // Считаем количество товаров этого бренда среди filteredProducts
              const count = filteredProducts.filter(p => p.vendor === vendor).length;
              const percent = filteredProducts.length > 0 ? Math.round(count / filteredProducts.length * 100) : 0;
              return (
                <label key={vendor ?? ''} className="flex items-center cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded"
                    checked={selectedVendors.includes(vendor ?? '')}
                    onChange={e => {
                      const safeVendor = vendor ?? '';
                      setSelectedVendors(prev => {
                        if (e.target.checked) {
                          return [...prev, safeVendor].filter(v => v);
                        } else {
                          return prev.filter(v => v && v === safeVendor ? false : true);
                        }
                      });
                    }}
                  />
                  <span className="text-sm truncate">{vendor} <span className="text-gray-400">({count}{count > 0 ? `, ${percent}%` : ''})</span></span>
                </label>
              );
            })}
            {selectedVendors.length > 0 && (
              <div className="mt-3 pt-3">
                <button
                  onClick={() => setSelectedVendors([])}
                  className="w-full px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                >
                  Сбросить выбор
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Фильтр: Со скидкой (чекбоксы) */}
      <div>
        <div 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
          onClick={() => toggleSection('discount')}
        >
          <span className="text-sm font-semibold">Со скидкой</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${collapsedSections.discount ? '' : 'transform rotate-180'}`} />
        </div>
        {!collapsedSections.discount && (
          <div className="flex flex-col gap-2 pl-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="discountFilter"
                className="h-4 w-4 text-blue-600"
                checked={!attributeFilters['__discount'] || attributeFilters['__discount'][0] === 'all'}
                onChange={() => setAttributeFilters(prev => ({ ...prev, __discount: ['all'] }))}
              />
              <span className="text-sm">Все</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="discountFilter"
                className="h-4 w-4 text-blue-600"
                checked={attributeFilters['__discount']?.[0] === 'discount'}
                onChange={() => setAttributeFilters(prev => ({ ...prev, __discount: ['discount'] }))}
              />
              <span className="text-sm">Со скидкой</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="discountFilter"
                className="h-4 w-4 text-blue-600"
                checked={attributeFilters['__discount']?.[0] === 'no_discount'}
                onChange={() => setAttributeFilters(prev => ({ ...prev, __discount: ['no_discount'] }))}
              />
              <span className="text-sm">Без скидки</span>
            </label>
          </div>
        )}
      </div>
      {/* Динамические секции для атрибутов, кроме 'Краткое описание' */}
      {Object.entries(attributeOptions).filter(([attrName]) => attrName.toLowerCase() !== 'краткое описание').map(([attrName, values]) => {
        const sectionKey = `attr_${attrName}`;
        return (
          <div key={attrName}>
            <div 
              className="flex items-center justify-between cursor-pointer select-none mb-2"
              onClick={() => toggleSection(sectionKey)}
            >
              <span className="text-sm font-semibold truncate">{attrName}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${collapsedSections[sectionKey] ? '' : 'transform rotate-180'}`} />
            </div>
            {!collapsedSections[sectionKey] && (
              <div className="flex flex-col gap-2 pl-1">
                {/* Для размеров - разбиваем значения */}
                {attrName.toLowerCase().includes('размер') ? (
                  (() => {
                    const allSizes = new Set<string>();
                    values.forEach(val => {
                      val.split(/[,;]+/).map(s => s.trim()).filter(Boolean).forEach(size => allSizes.add(size));
                    });
                    const sizeList = Array.from(allSizes).sort((a, b) => a.localeCompare(b, 'ru', {numeric: true}));
                    return (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {sizeList.map(size => (
                          <label key={size} className="flex items-center cursor-pointer px-2 py-1 text-xs rounded mb-1 gap-2">
                            <input
                              type="checkbox"
                              className="h-3 w-3 text-blue-600 mr-1.5 rounded"
                              checked={attributeFilters[attrName]?.includes(size) || false}
                              onChange={e => {
                                setAttributeFilters(prev => {
                                  const prevArr = prev[attrName] || [];
                                  if (e.target.checked) {
                                    return { ...prev, [attrName]: [...prevArr, size] };
                                  } else {
                                    return { ...prev, [attrName]: prevArr.filter(v => v !== size) };
                                  }
                                });
                              }}
                            />
                            {size}
                          </label>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  // Для других атрибутов - стандартный вывод
                  <div className="flex flex-col gap-2">
                    {values.map(value => (
                      <label key={value} className="flex items-center cursor-pointer gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 rounded"
                          checked={attributeFilters[attrName]?.includes(value) || false}
                          onChange={e => {
                            setAttributeFilters(prev => {
                              const prevArr = prev[attrName] || [];
                              if (e.target.checked) {
                                return { ...prev, [attrName]: [...prevArr, value] };
                              } else {
                                return { ...prev, [attrName]: prevArr.filter(v => v !== value) };
                              }
                            });
                          }}
                        />
                        <span className="text-sm">{value}</span>
                      </label>
                    ))}
                  </div>
                )}
                {attributeFilters[attrName]?.length > 0 && (
                  <div className="mt-3 pt-3">
                    <button
                      onClick={() => setAttributeFilters(prev => ({...prev, [attrName]: []}))}
                      className="w-full px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                    >
                      Сбросить выбор
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button
        className="mt-4 w-full px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm font-medium"
        onClick={() => setShowBrandStatsModal(true)}
      >
        Статистика по брендам
      </button>
    </div>
  );
  
  // Модальное окно для массового редактирования
  const renderBulkEditModal = () => {
    if (!showBulkEditModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Массовое редактирование ({selectedProducts.length} товаров)</h2>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Доступность</p>
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  checked={bulkAvailability === true}
                  onChange={() => setBulkAvailability(true)}
                />
                <span className="ml-2 text-sm">В наличии</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  checked={bulkAvailability === false}
                  onChange={() => setBulkAvailability(false)}
                />
                <span className="ml-2 text-sm">Отсутствует</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  checked={bulkAvailability === null}
                  onChange={() => setBulkAvailability(null)}
                />
                <span className="ml-2 text-sm">Не менять</span>
              </label>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Выгрузка</p>
            <div className="flex items-center space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  checked={bulkIncludeInExport === true}
                  onChange={() => setBulkIncludeInExport(true)}
                />
                <span className="ml-2 text-sm">Включить</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  checked={bulkIncludeInExport === false}
                  onChange={() => setBulkIncludeInExport(false)}
                />
                <span className="ml-2 text-sm">Исключить</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600"
                  checked={bulkIncludeInExport === null}
                  onChange={() => setBulkIncludeInExport(null)}
                />
                <span className="ml-2 text-sm">Не менять</span>
              </label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowBulkEditModal(false);
                setBulkAvailability(null);
                setBulkIncludeInExport(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={handleBulkEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Функция для исключения всех выбранных товаров из выгрузки
  const handleExcludeAllSelected = () => {
    if (selectedProducts.length === 0) return;
    
    // Подтверждение действия
    if (window.confirm(`Вы уверены, что хотите исключить ${selectedProducts.length} товаров из выгрузки?`)) {
      updateProducts(feedId!, selectedProducts, { includeInExport: false });
      alert(`${selectedProducts.length} товаров исключены из выгрузки.`);
    }
  };
  
  // Функция для включения всех выбранных товаров в выгрузку
  const handleIncludeAllSelected = () => {
    if (selectedProducts.length === 0) return;
    
    // Подтверждение действия
    if (window.confirm(`Вы уверены, что хотите включить ${selectedProducts.length} товаров в выгрузку?`)) {
      updateProducts(feedId!, selectedProducts, { includeInExport: true });
      alert(`${selectedProducts.length} товаров включены в выгрузку.`);
    }
  };

  // Функция для обновления данных из исходного фида по ссылке
  const reloadFeedData = async () => {
    if (!currentFeed || !currentFeed.metadata?.url) {
      alert('В исходном фиде не указана ссылка (metadata.url)');
      return;
    }
    setShowUpdateOptionsModal(true); // сначала показываем модалку опций
  };

  // После выбора опций — запускаем сравнение
  const handleApplyUpdateOptions = async () => {
    setShowUpdateOptionsModal(false);
    if (!currentFeed || !currentFeed.metadata?.url) return;
    try {
      const xml = await fetchFeedContent(currentFeed.metadata.url);
      let parsedFeed;
      if (xml.length > 5 * 1024 * 1024) {
        parsedFeed = await importLargeFeedFromXml(
          xml,
          currentFeed.name,
          undefined,
          currentFeed.metadata.url
        );
      } else {
        parsedFeed = await importFeedFromXml(
          xml,
          currentFeed.name,
          currentFeed.metadata.url
        );
      }
      // Сравниваем товары с учётом опций (реализация будет далее)
      const diffs = diffProducts(currentFeed.products, parsedFeed.products, updateOptions, currentFeed.metadata.mergedIdMap);
      setDiffs(diffs);
      setPendingParsedFeed(parsedFeed);
      setShowDiffModal(true);
    } catch (e: any) {
      alert('Ошибка при обновлении фида: ' + (e.message || e));
    }
  };

  const handleApplyFeedUpdate = () => {
    if (!pendingParsedFeed) return;
    // Применяем только отличающиеся данные и только выбранные поля
    const diffsToApply = diffs;
    const updatedProducts = [...currentFeed.products];
    // Обновляем существующие
    diffsToApply.filter(d => d.type === 'changed').forEach(d => {
      const idx = updatedProducts.findIndex(p => p.id === d.id);
      if (idx !== -1) {
        const selectedFields = fieldSelection[d.id] || {};
        const newProduct: any = { ...updatedProducts[idx] };
        Object.entries(selectedFields).forEach(([field, checked]) => {
          if (checked) {
            if (field === 'attributes' && Array.isArray(d.newProduct.attributes)) {
              // Добавляем только новые значения атрибутов
              const oldAttrs = Array.isArray(newProduct.attributes) ? newProduct.attributes : [];
              const newAttrs = d.newProduct.attributes.filter((attr: any) => {
                return !oldAttrs.some((a: any) => a.name === attr.name && a.value === attr.value);
              });
              newProduct.attributes = [...oldAttrs, ...newAttrs];
            } else {
              newProduct[field] = d.newProduct[field];
            }
          }
        });
        updatedProducts[idx] = newProduct;
      }
    });
    // Добавляем новые
    diffsToApply.filter(d => d.type === 'new').forEach(d => {
      updatedProducts.push(d.newProduct);
    });
    updateFeed(currentFeed.id, {
      products: updatedProducts,
      categories: pendingParsedFeed.categories,
      dateModified: new Date().toISOString(),
      metadata: {
        ...currentFeed.metadata,
        url: currentFeed.metadata.url
      }
    });
    setShowDiffModal(false);
    setPendingParsedFeed(null);
    setDiffs([]);
    setFieldSelection({});
    alert('Обновление завершено!');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Верхняя панель с информацией о фиде */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            {/* <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Назад к списку фидов</span>
            </Link> */}
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              {currentFeed.name}
            </h1>
            {/* Информация о фиде в одну строку */}
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-700">
              <span><span className="font-medium">Магазин:</span> {currentFeed.metadata?.name || '—'}</span>
              <span className="hidden md:inline-block h-4 w-px bg-gray-300 align-middle"></span>
              <span><span className="font-medium">Товаров:</span> {currentFeed.products.length}</span>
              <span className="hidden md:inline-block h-4 w-px bg-gray-300 align-middle"></span>
              <span><span className="font-medium">Категорий:</span> {currentFeed.categories.length}</span>
              <span className="hidden md:inline-block h-4 w-px bg-gray-300 align-middle"></span>
              <span><span className="font-medium">Последнее изменение:</span> {currentFeed.metadata?.date ? (new Date(currentFeed.metadata.date).toLocaleString('ru-RU')) : '—'}</span>
              <span className="hidden md:inline-block h-4 w-px bg-gray-300 align-middle"></span>
              <span>
                {currentFeed.metadata?.url && (
                  <a
                    href={currentFeed.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline flex items-center gap-1 truncate max-w-[220px] align-middle"
                    title="Открыть исходный фид"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="truncate align-middle">{currentFeed.metadata.url}</span>
                  </a>
                )}
              </span>
            </div>
          </div>
      {renderToolbar()}
        </div>
      </div>
      
      {/* URL фида (отображается только если фид опубликован) */}
      {feedPublicUrl && currentFeed?.isPublished && (
        <div className="bg-green-50 border-b border-green-200 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700">Фид опубликован</span>
            </div>
            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              <div className="flex-1 bg-white border border-green-200 rounded-md px-3 py-2 text-sm truncate">
                {feedPublicUrl}
              </div>
              <button
                onClick={handleCopyFeedUrl}
                className="inline-flex items-center gap-2 px-3 py-2 border border-green-600 text-green-700 bg-white rounded-md hover:bg-green-50"
              >
                <Copy className="h-4 w-4" />
                <span>{copySuccess ? 'Скопировано!' : 'Копировать'}</span>
              </button>
              <a 
                href={feedPublicUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Открыть</span>
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* Контент с фильтрами и таблицей */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Боковая панель с фильтрами */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-200 ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'}`}>
          <div className="h-full flex flex-col relative">
            {/* Кнопка сворачивания фильтров — в левом верхнем углу */}
            <button 
              onClick={() => setSidebarCollapsed(true)}
              className="absolute top-2 left-2 text-gray-500 hover:text-blue-600 z-10 p-1 rounded transition"
              title="Свернуть фильтры"
              style={{ boxShadow: '0 1px 4px 0 rgba(0,0,0,0.04)' }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar" style={{paddingLeft: '1rem', paddingTop: '80px'}}>
              {renderSidebarFilters()}
            </div>
          </div>
        </div>
        
        {/* Кнопка показа фильтров (видима только при скрытой боковой панели) */}
        {sidebarCollapsed && (
          <button 
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 border-l-0 rounded-r-md p-2 shadow-sm z-10 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5 text-gray-500" />
          </button>
        )}
        
        {/* Основной контент с таблицей */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Панель поиска и фильтрации */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Поиск по ID, названию, производителю..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkEditModal(true)}
                  disabled={selectedProducts.length === 0}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${
                    selectedProducts.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Edit className="h-4 w-4" />
                  <span>Редактировать ({selectedProducts.length})</span>
                </button>
                
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedProducts.length === 0}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${
                    selectedProducts.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Удалить</span>
                </button>
              </div>
            </div>
            
            {/* Индикатор выбранных товаров и быстрые действия */}
            {selectedProducts.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-700">
                  Выбрано: <span className="font-medium">{selectedProducts.length}</span>
                </span>
                <div className="flex-1"></div>
                <button
                  onClick={handleIncludeAllSelected}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
                >
                  <CheckSquare className="h-4 w-4" />
                  <span>Включить в выгрузку</span>
                </button>
                <button
                  onClick={handleExcludeAllSelected}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm"
                >
                  <X className="h-4 w-4" />
                  <span>Исключить из выгрузки</span>
                </button>
                <button
                  onClick={handleBulkGenerateUrls}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm"
                >
                  <LinkIcon className="h-4 w-4" />
                  <span>Сгенерировать URL</span>
                </button>
                <button
                  onClick={handleSelectAllPagesProducts}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 text-sm"
                >
                  {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? (
                    <>
                      <X className="h-4 w-4" />
                      <span>Снять выделение</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      <span>Выбрать все {filteredProducts.length}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Таблица продуктов с фиксированным заголовком */}
          <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
            {/* Контейнер для таблицы с горизонтальной прокруткой */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={paginatedProducts.length > 0 && selectedProducts.length === paginatedProducts.length}
                      onChange={handleSelectAllProducts}
                    />
                  </div>
                </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  <div className="flex items-center">
                        <span>Фото</span>
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0 w-auto">
                      <div className="flex items-center cursor-pointer flex-1" onClick={() => handleSort('name')}>
                        <span>Название</span>
                    {sortColumn === 'name' && (
                          <span className="ml-1 text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      <div className="flex items-center cursor-pointer" onClick={() => handleSort('price')}>
                        <span>Цена</span>
                    {sortColumn === 'price' && (
                          <span className="ml-1 text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      <div className="flex items-center justify-center cursor-pointer" onClick={() => handleSort('available')}>
                        <span>Наличие</span>
                    {sortColumn === 'available' && (
                          <span className="ml-1 text-gray-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36 break-words">
                  <div className="flex items-center">
                        <span>Бренд</span>
                  </div>
                </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      <div className="flex items-center justify-center">
                        <span>В выгрузке</span>
                      </div>
                </th>
                    <th scope="col" className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      <div className="flex items-center">
                        <span>URL</span>
                      </div>
                </th>
                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      <div className="flex items-center justify-center">
                        <span>Действия</span>
                      </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product, index) => (
                <tr 
                  key={product.id}
                      className={`hover:bg-blue-50 transition-colors cursor-pointer ${selectedProducts.includes(product.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => handleEditProduct(product.id)}
                >
                      <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                      />
                    </div>
                  </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                    {renderProductImage(product)}
                  </td>
                      <td className="px-3 py-3 min-w-0 w-auto">
                        <div className="text-sm font-medium text-gray-900 break-words line-clamp-2">
                      {product.name}
                    </div>
                        <div className="text-xs text-gray-500 break-words">
                      ID: {product.id}
                    </div>
                  </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                      {product.price} {product.currency}
                    </div>
                    {product.oldPrice && (
                      <div className="text-xs text-gray-500 line-through">
                        {product.oldPrice} {product.currency}
                      </div>
                    )}
                  </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                          {product.available ? 'В наличии' : 'Отсутствует'}
                    </span>
                  </td>
                      <td className="px-3 py-3 break-words">
                        <div className="text-sm text-gray-900 font-medium break-words">
                      {product.vendor || '-'}
                    </div>
                  </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center">
                      <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExportStatus(product.id);
                            }}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.includeInExport
                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {product.includeInExport ? 'Включен' : 'Исключен'}
                      </button>
                    </div>
                  </td>
                      <td className="px-3 py-3 w-24 max-w-xs truncate overflow-hidden whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.url || product.generatedUrl ? (
                            <a 
                              href={product.url || product.generatedUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                              onClick={(e) => e.stopPropagation()}
                              title={product.url || product.generatedUrl}
                            >
                              <span className="truncate mr-1">{product.url || product.generatedUrl}</span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">Нет URL</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product.id);
                          }}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          <Edit className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && (
                <tr>
                      <td colSpan={9} className="px-3 py-4 text-center text-sm text-gray-500">
                        <div className="flex flex-col items-center justify-center py-6">
                          <Search className="h-8 w-8 text-gray-300 mb-2" />
                          <p>Нет товаров, соответствующих критериям поиска</p>
                          <button 
                            onClick={() => {
                              setSearchQuery('');
                              setAvailabilityFilter(null);
                              setSelectedVendors([]);
                              setExportFilter(null);
                              setAttributeFilters({});
                            }}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Сбросить все фильтры
                          </button>
                        </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
            {/* Пагинация */}
        {totalPages > 1 && (
              <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1
                        ? 'text-gray-300 bg-gray-50'
                        : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                    Пред.
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages
                        ? 'text-gray-300 bg-gray-50'
                        : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                    След.
              </button>
            </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Показано <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">
                        {Math.min(startIndex + productsPerPage, filteredProducts.length)}
                      </span> из <span className="font-medium">{filteredProducts.length}</span> товаров
                    </p>
          </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                          currentPage === 1
                            ? 'text-gray-300 bg-gray-50'
                            : 'text-gray-500 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Первая</span>
                        <span className="flex items-center">
                          <ArrowLeft className="h-4 w-4" />
                          <ArrowLeft className="h-4 w-4 -ml-1" />
                        </span>
              </button>
                  <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                          currentPage === 1
                            ? 'text-gray-300 bg-gray-50'
                            : 'text-gray-500 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Предыдущая</span>
                        <ArrowLeft className="h-5 w-5" />
                  </button>
                      
                      {/* Номера страниц */}
                      {(() => {
                        // Логика отображения номеров страниц
                        const pageButtons = [];
                        let startPage = 1;
                        let endPage = totalPages;
                        
                        // Если больше 5 страниц, показываем не все
                        if (totalPages > 5) {
                          // Всегда показываем текущую страницу и по 2 до и после
                          if (currentPage <= 3) {
                            // Мы в начале списка
                            endPage = 5;
                          } else if (currentPage >= totalPages - 2) {
                            // Мы в конце списка
                            startPage = totalPages - 4;
                          } else {
                            // Мы в середине
                            startPage = currentPage - 2;
                            endPage = currentPage + 2;
                          }
                        }
                        
                        // Добавляем номера страниц
                        for (let i = startPage; i <= endPage; i++) {
                          pageButtons.push(
                  <button
                              key={i}
                              onClick={() => setCurrentPage(i)}
                              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                                currentPage === i
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {i}
                  </button>
                          );
                        }
            
                        return pageButtons;
                      })()}
                      
              <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium ${
                          currentPage === totalPages
                            ? 'text-gray-300 bg-gray-50'
                            : 'text-gray-500 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Следующая</span>
                        <ArrowRight className="h-5 w-5" />
              </button>
              <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                          currentPage === totalPages
                            ? 'text-gray-300 bg-gray-50'
                            : 'text-gray-500 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Последняя</span>
                        <span className="flex items-center">
                          <ArrowRight className="h-4 w-4" />
                          <ArrowRight className="h-4 w-4 -ml-1" />
                        </span>
              </button>
                    </nav>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
      
      {/* Модальные окна - рендерим здесь, чтобы они не были внутри скролла */}
      {renderBulkEditModal()}
      {renderAIModals()}
      {showDiffModal && (
        <FeedUpdateDiffModal
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          diffs={diffs}
          onApply={handleApplyFeedUpdate}
          onFieldSelectionChange={setFieldSelection}
          fieldSelection={fieldSelection}
        />
      )}
      {showImageModal && currentProduct && currentProduct.picture && currentProduct.picture.length > 0 && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-80 flex items-center justify-center p-4">
          {/* Модальное окно для просмотра изображений */}
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full overflow-hidden">
            {/* Верхняя панель с информацией и кнопкой закрытия */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {currentProduct.name}
              </h3>
                <p className="text-sm text-gray-500">
                  Изображение {currentModalImageIndex + 1} из {currentProduct.picture?.length}
                </p>
              </div>
                <button
                  onClick={handleCloseImageModal}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                <X className="h-6 w-6" />
                </button>
            </div>
            
            {/* Область с изображением */}
            <div className="relative bg-gray-100 h-[calc(100vh-20rem)] flex items-center justify-center p-4">
                  <img 
                src={currentProduct.picture[currentModalImageIndex]} 
                    alt={currentProduct.name}
                className="max-h-full max-w-full object-contain"
              />
              
              {/* Кнопки навигации для листания изображений */}
              {currentProduct.picture.length > 1 && (
                <>
                  <button
                    onClick={() => navigateModalImages('prev')}
                    className="absolute left-4 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 focus:outline-none transition-opacity"
                    disabled={currentModalImageIndex === 0}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => navigateModalImages('next')}
                    className="absolute right-4 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 focus:outline-none transition-opacity"
                    disabled={currentModalImageIndex === currentProduct.picture.length - 1}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
                </div>
                
            {/* Превью всех изображений продукта */}
            {currentProduct.picture.length > 1 && (
              <div className="p-4 bg-white border-t">
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                  {currentProduct.picture.map((imgUrl, index) => (
                    <button
                          key={index}
                      onClick={() => setCurrentModalImageIndex(index)}
                      className={`relative flex-shrink-0 h-16 w-16 border-2 rounded overflow-hidden ${
                        index === currentModalImageIndex 
                        ? 'border-blue-500 shadow-sm' 
                        : 'border-transparent hover:border-gray-300'
                      }`}
                        >
                          <img 
                        src={imgUrl} 
                        alt={`Превью ${index + 1}`} 
                        className="h-full w-full object-cover"
                      />
                    </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
                      </div>
                    )}
      
      {/* Инлайн-стили для скроллбара */}
      <style>{customScrollbarStyles}</style>
      {showUpdateOptionsModal && (
        <UpdateOptionsModal
          isOpen={showUpdateOptionsModal}
          onClose={() => setShowUpdateOptionsModal(false)}
          onApply={handleApplyUpdateOptions}
          options={updateOptions}
          setOptions={setUpdateOptions}
        />
      )}
      {showBrandStatsModal && (
        <Modal isOpen={showBrandStatsModal} onClose={() => setShowBrandStatsModal(false)} title="Статистика по брендам" size="md">
          <div className="space-y-2">
            {(() => {
              const brandStats: {vendor: string, count: number}[] = [];
              filteredProducts.forEach(p => {
                if (!p.vendor) return;
                const stat = brandStats.find(s => s.vendor === p.vendor);
                if (stat) stat.count++;
                else brandStats.push({vendor: p.vendor, count: 1});
              });
              brandStats.sort((a, b) => b.count - a.count);
              return brandStats.map(({vendor, count}) => {
                const percent = Math.round(count / filteredProducts.length * 100);
                return (
                  <div key={vendor} className="flex items-center gap-2">
                    <span className="w-32 truncate text-xs text-gray-700">{vendor}</span>
                    <div className="flex-1 bg-gray-200 rounded h-3 overflow-hidden">
                      <div className="bg-blue-500 h-3" style={{width: `${percent}%`}}></div>
                    </div>
                    <span className="w-10 text-right text-xs text-gray-600">{count}</span>
                    <span className="w-8 text-right text-xs text-gray-400">{percent}%</span>
                  </div>
                );
              });
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FeedEditor;