import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link, AlertCircle, Server, RefreshCw, Search } from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { isProxyAvailable, fetchFeedContent } from '../services/proxyService';
import DuplicatesAnalyzer from '../components/DuplicatesAnalyzer';
import { Feed } from '../types/feed';
import Modal from '../components/layout/Modal';
import FeedImportMappingModal from '../components/FeedImportMappingModal';

const FeedImport = () => {
  const [importMethod, setImportMethod] = useState<'file' | 'url'>('file');
  const [feedUrl, setFeedUrl] = useState('');
  const [feedName, setFeedName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [useBatchProcessing, setUseBatchProcessing] = useState<boolean>(true);
  const [isProxyServerAvailable, setIsProxyServerAvailable] = useState<boolean | null>(null);
  const [isCheckingProxy, setIsCheckingProxy] = useState<boolean>(false);
  const [parsedFeed, setParsedFeed] = useState<Feed | null>(null);
  const [showDuplicatesAnalyzer, setShowDuplicatesAnalyzer] = useState<boolean>(false);
  const [enableDuplicatesCheck, setEnableDuplicatesCheck] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [pendingMergedFeed, setPendingMergedFeed] = useState<Feed | null>(null);
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [pendingFeedToAdd, setPendingFeedToAdd] = useState<Feed | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [exampleOffer, setExampleOffer] = useState<Record<string, any> | null>(null);
  const [pendingFeed, setPendingFeed] = useState<Feed | null>(null);
  
  const { importFeedFromXml, importLargeFeedFromXml, setCurrentFeed, addFeed, updateFeed, feeds } = useFeed();
  const navigate = useNavigate();
  
  // Проверяем доступность прокси-сервера при загрузке компонента
  useEffect(() => {
    checkProxyAvailability();
  }, []);
  
  const checkProxyAvailability = async () => {
    setIsCheckingProxy(true);
    const available = await isProxyAvailable();
    setIsProxyServerAvailable(available);
    console.log('Proxy server availability:', available);
    setIsCheckingProxy(false);
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file && !feedName) {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setFeedName(fileName);
    }
    setError(null);
    // Сброс значения input, чтобы повторный выбор того же файла срабатывал
    e.target.value = "";
  };
  
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFeedUrl(url);
    
    // Автоматически генерируем имя из URL, если имя не заполнено
    if (url && !feedName) {
      try {
        // Попытка извлечь имя домена из URL
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace('www.', '');
        setFeedName(hostname.split('.')[0] + '-feed');
      } catch (err) {
        // Если URL не валидный, не меняем имя
      }
    }
    
    setError(null);
  };
  
  const handleProgressUpdate = (processed: number, total: number) => {
    const progressPercentage = Math.round((processed / total) * 100);
    setProgress(progressPercentage);
  };
  
  const handleImport = async () => {
    setError(null);
    setIsLoading(true);
    setProgress(0);
    
    if (!feedName.trim()) {
      setError('Please provide a name for the feed');
      setIsLoading(false);
      return;
    }
    
    try {
      let xmlContent = '';
      
      if (importMethod === 'file') {
        if (!selectedFile) {
          setError('Please select a file to import');
          setIsLoading(false);
          return;
        }
        
        xmlContent = await readFileAsText(selectedFile);
        
        // Автоматически включаем пакетную обработку для больших файлов
        const fileSizeInMB = selectedFile.size / (1024 * 1024);
        if (fileSizeInMB > 5 && !useBatchProcessing) {
          console.log(`File size is ${fileSizeInMB.toFixed(2)}MB, switching to batch processing`);
          setUseBatchProcessing(true);
        }
      } else {
        if (!feedUrl.trim()) {
          setError('Please enter a valid URL');
          setIsLoading(false);
          return;
        }
        
        // Используем улучшенный сервис для получения фида
        try {
          console.log('Fetching feed from URL:', feedUrl);
          
          // Используем новую функцию fetchFeedContent, которая автоматически выбирает 
          // между прокси и прямым запросом
          xmlContent = await fetchFeedContent(feedUrl);
          
          console.log('Successfully fetched content, length:', xmlContent.length);
        } catch (err: any) {
          console.error('Fetch error:', err);
          setError(`Failed to fetch from URL: ${err.message}`);
          setIsLoading(false);
          return;
        }
      }
      
      if (!xmlContent || xmlContent.trim().length === 0) {
        setError('Received empty content');
        setIsLoading(false);
        return;
      }
      
      // Проверка, содержит ли контент XML-разметку
      const hasXmlMarkup = xmlContent.includes('<?xml') || 
                          xmlContent.includes('<yml_catalog') || 
                          xmlContent.includes('<shop>') ||
                          xmlContent.includes('<offer');
      
      if (!hasXmlMarkup) {
        // Попытаемся проверить, является ли контент HTML-страницей с ошибкой
        if (xmlContent.toLowerCase().includes('<html') && 
            (xmlContent.toLowerCase().includes('forbidden') || 
             xmlContent.toLowerCase().includes('403') ||
             xmlContent.toLowerCase().includes('access denied'))) {
          setError('Доступ к фиду запрещен (403 Forbidden). Возможно, требуется авторизация или нужно скачать файл вручную.');
        } else {
          setError('Полученный контент не похож на XML фид. Проверьте URL или загрузите файл вручную.');
        }
        setIsLoading(false);
        return;
      }
      
      try {
        let feed;
        if (useBatchProcessing) {
          feed = await importLargeFeedFromXml(
            xmlContent,
            feedName,
            handleProgressUpdate,
            importMethod === 'url' ? feedUrl : undefined
          );
        } else {
          feed = await importFeedFromXml(
            xmlContent,
            feedName,
            importMethod === 'url' ? feedUrl : undefined
          );
        }
        
        if (!feed) {
          throw new Error('Failed to parse feed data');
        }
        
        // --- Новый блок: анализ структуры и маппинг ---
        if (feed.products.length > 0) {
          // Берём rawOffer (исходный оффер из XML), если есть, иначе сам Product
          const offer = feed.products[0].rawOffer || feed.products[0];
          setExampleOffer(offer);
          setMapping(autoMapping(offer));
          setPendingFeed(feed);
          setShowMappingModal(true);
          setIsLoading(false);
          return; // Ждём подтверждения маппинга
        }
        // --- конец нового блока ---

        if (enableDuplicatesCheck) {
          setParsedFeed(feed);
          setShowDuplicatesAnalyzer(true);
          setIsLoading(false);
        } else {
          setPendingFeedToAdd(feed);
          setShowAddFeedModal(true);
          setIsLoading(false);
        }
      } catch (parseError: any) {
        console.error('Parse error:', parseError);
        setError(`Failed to parse feed data: ${parseError.message}`);
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(`Failed to import feed: ${err.message}`);
      setIsLoading(false);
    }
  };
  
  // Обработчик завершения анализа дубликатов
  const handleDuplicatesMergeComplete = (mergedFeed: Feed) => {
    addFeed(mergedFeed);
    setCurrentFeed(mergedFeed.id);
    setPendingMergedFeed(mergedFeed);
    navigate(`/feeds/${mergedFeed.id}?pendingMerge=1`);
  };
  
  // Обработчик отмены анализа дубликатов
  const handleDuplicatesCancel = () => {
    // Если пользователь отменил анализ, проверяем, не добавлен ли уже этот фид
    if (parsedFeed) {
      const existingFeedIndex = feeds.findIndex((f: Feed) => f.id === parsedFeed.id);
      
      if (existingFeedIndex !== -1) {
        // Если фид уже существует, просто используем его
        setCurrentFeed(parsedFeed.id);
      } else {
        // Только если фид не существует, добавляем его
        addFeed(parsedFeed);
        setCurrentFeed(parsedFeed.id);
      }
      navigate(`/feeds/${parsedFeed.id}`);
    }
    setShowDuplicatesAnalyzer(false);
  };
  
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  };
  
  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
      if (!feedName) {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        setFeedName(fileName);
      }
      setError(null);
    }
  };
  
  // Функция применения маппинга ко всем товарам
  function applyMappingToProducts(feed: Feed, mapping: Record<string, string>): Feed {
    const newProducts = feed.products.map((prod) => {
      // Берём rawOffer (исходный оффер), если есть, иначе сам Product
      const raw = prod.rawOffer || prod;
      const mapped: any = { ...prod };
      Object.entries(mapping).forEach(([productField, offerField]) => {
        if (offerField && raw[offerField] !== undefined) {
          mapped[productField] = raw[offerField];
        }
      });
      return mapped;
    });
    return { ...feed, products: newProducts };
  }
  
  const productFields = [
    "name", "description", "price", "oldPrice", "currency", "categoryId", "url", "picture", "available", "vendor", "vendorCode"
  ];

  function autoMapping(exampleOffer: Record<string, any>): Record<string, string> {
    const mapping: Record<string, string> = {};
    const candidates: Record<string, string[]> = {
      name: ["name", "model", "title"],
      description: ["description", "desc", "model", "title"],
      price: ["price"],
      oldPrice: ["oldPrice", "old_price", "oldprice"],
      currency: ["currency", "currencyId", "currency_id"],
      categoryId: ["categoryId", "category_id"],
      url: ["url"],
      picture: ["picture", "image", "images"],
      available: ["available", "@_available"],
      vendor: ["vendor", "brand"],
      vendorCode: ["vendorCode", "vendor_code", "article"],
    };
    for (const field of productFields) {
      const options = candidates[field] || [field];
      const found = options.find(opt => exampleOffer[opt] !== undefined);
      if (found) mapping[field] = found;
    }
    return mapping;
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Import YML Feed</h2>
        <p className="mt-1 text-sm text-gray-500">
          Import your product feed in Yandex Market Language (YML) format
        </p>
      </div>
      
      <div className="p-6 bg-white rounded-lg shadow-sm max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <button
              onClick={() => {
                setImportMethod('file');
                setError(null);
              }}
              className={`flex items-center justify-center w-full px-4 py-3 rounded-md ${
                importMethod === 'file'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
              }`}
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload File
            </button>
          </div>
          
          <div>
            <button
              onClick={() => {
                setImportMethod('url');
                setError(null);
              }}
              className={`flex items-center justify-center w-full px-4 py-3 rounded-md ${
                importMethod === 'url'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200'
              }`}
            >
              <Link className="w-5 h-5 mr-2" />
              Import from URL
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="feedName" className="block text-sm font-medium text-gray-700 mb-1">
            Feed Name
          </label>
          <input
            type="text"
            id="feedName"
            value={feedName}
            onChange={(e) => setFeedName(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter a name for this feed"
          />
        </div>
        
        {importMethod === 'file' ? (
          <div className="space-y-4">
            <div
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md transition-colors duration-150 ${isDragActive ? 'border-blue-500 bg-blue-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex justify-center text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                  >
                    <span onClick={handleFileSelect}>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xml,.yml"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">XML or YML up to 100MB</p>
                {selectedFile && (
                  <div className="text-sm text-blue-600 font-medium mt-2">
                    <p>Selected: {selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          
            <div className="flex items-center">
              <input
                id="useBatchProcessing"
                type="checkbox"
                checked={useBatchProcessing}
                onChange={(e) => setUseBatchProcessing(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useBatchProcessing" className="ml-2 block text-sm text-gray-700">
                Use batch processing for large files
              </label>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="feedUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Feed URL
            </label>
            <input
              type="url"
              id="feedUrl"
              value={feedUrl}
              onChange={handleUrlChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://example.com/feed.xml"
            />
            
            <div className="mt-2 flex items-center justify-between">
              <div className={`flex items-center text-sm ${isProxyServerAvailable ? 'text-green-600' : 'text-amber-600'}`}>
                <Server className="w-4 h-4 mr-1" />
                {isCheckingProxy ? (
                  <span className="flex items-center">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Проверка прокси-сервера...
                  </span>
                ) : (
                  isProxyServerAvailable 
                    ? 'Прокси-сервер доступен для обхода CORS-ограничений' 
                    : 'Прокси-сервер недоступен, импорт может быть ограничен CORS-политикой'
                )}
              </div>
              <button 
                onClick={checkProxyAvailability}
                disabled={isCheckingProxy}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isCheckingProxy ? 'animate-spin' : ''}`} />
                Проверить снова
              </button>
            </div>
          </div>
        )}
        
        {/* Настройки обработки дубликатов */}
        <div className="mt-4 flex items-center">
          <input
            id="enableDuplicatesCheck"
            type="checkbox"
            checked={enableDuplicatesCheck}
            onChange={(e) => setEnableDuplicatesCheck(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="enableDuplicatesCheck" className="ml-2 block text-sm text-gray-700 flex items-center">
            <Search className="w-4 h-4 mr-1" />
            Проверять дубликаты товаров по URL
          </label>
        </div>
        <div className={`ml-6 text-xs text-gray-500 mt-1 ${enableDuplicatesCheck ? '' : 'opacity-50'}`}>
          Будет выполнен анализ и группировка товаров с одинаковыми URL. Это полезно для товаров с разными размерами/цветами.
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        
        {isLoading && progress > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Importing...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              progress > 0 ? `Importing... ${progress}%` : 'Importing...'
            ) : 'Import Feed'}
          </button>
        </div>
      </div>
      
      {/* Компонент анализа дубликатов */}
      <DuplicatesAnalyzer
        visible={showDuplicatesAnalyzer && !!parsedFeed}
        feed={parsedFeed}
        onMergeComplete={handleDuplicatesMergeComplete}
        onCancel={handleDuplicatesCancel}
      />
      
      {/* Модалка подтверждения добавления фида */}
      {showAddFeedModal && pendingFeedToAdd && (
        <Modal
          isOpen={showAddFeedModal}
          onClose={() => setShowAddFeedModal(false)}
          title="Добавить новый фид?"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAddFeedModal(false)} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">Отмена</button>
              <button
                onClick={() => {
                  addFeed(pendingFeedToAdd);
                  setCurrentFeed(pendingFeedToAdd.id);
                  setShowAddFeedModal(false);
                  navigate(`/feeds/${pendingFeedToAdd.id}`);
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Добавить
              </button>
            </div>
          }
        >
          <div className="space-y-2">
            <div><b>Название:</b> {pendingFeedToAdd.name}</div>
            <div><b>Товаров:</b> {pendingFeedToAdd.products.length}</div>
            <div><b>Категорий:</b> {pendingFeedToAdd.categories.length}</div>
            <div><b>URL:</b> {pendingFeedToAdd.metadata?.url || '—'}</div>
          </div>
        </Modal>
      )}
      
      <FeedImportMappingModal
        isOpen={showMappingModal && !!exampleOffer}
        onClose={() => setShowMappingModal(false)}
        onConfirm={(selectedMapping) => {
          setMapping(selectedMapping);
          if (pendingFeed) {
            const mappedFeed = applyMappingToProducts(pendingFeed, selectedMapping);
            if (enableDuplicatesCheck) {
              setParsedFeed(mappedFeed);
              setShowDuplicatesAnalyzer(true);
            } else {
              setPendingFeedToAdd(mappedFeed);
              setShowAddFeedModal(true);
            }
            setShowMappingModal(false);
          }
        }}
        exampleOffer={exampleOffer || {}}
        productFields={productFields}
        initialMapping={mapping}
        diffPreview={exampleOffer && mapping ? (
          <table className="min-w-full text-xs border">
            <thead><tr><th className="border p-1">Поле</th><th className="border p-1">Значение</th></tr></thead>
            <tbody>
              {Object.entries(mapping).map(([productField, offerField]) => (
                <tr key={productField}>
                  <td className="border p-1">{productField}</td>
                  <td className="border p-1 max-w-xs truncate overflow-hidden whitespace-nowrap" title={String(exampleOffer[offerField] ?? '')}>
                    {String(exampleOffer[offerField] ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      />
    </div>
  );
};

export default FeedImport;