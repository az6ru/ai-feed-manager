import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Trash2, Plus, X, AlertCircle, Check, Sparkles, ArrowRight, ExternalLink
} from 'lucide-react';
import { useFeed } from '../context/FeedContext';
import { Product, Category, ProductAttribute } from '../types/feed';
import { aiService } from '../services/aiService';

// Импортируем компоненты из библиотеки
import Card from '../components/layout/Card';
import Field from '../components/layout/Field';
import Button from '../components/layout/Button';
import AIGenerated from '../components/AIGenerated';

const ProductEditor = () => {
  const { feedId, productId } = useParams<{ feedId: string, productId: string }>();
  const navigate = useNavigate();
  const { feeds, currentFeed, setCurrentFeed, updateProduct, deleteProduct } = useFeed();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAiEnhanceModal, setShowAiEnhanceModal] = useState(false);
  const [aiEnhanceType, setAiEnhanceType] = useState<'description' | 'attributes' | null>(null);
  const [enhancedText, setEnhancedText] = useState('');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
  const [currentModalImageIndex, setCurrentModalImageIndex] = useState(0);
  
  useEffect(() => {
    if (feedId) {
      // Find the feed if it exists
      const feed = feeds.find(f => f.id === feedId);
      
      if (feed) {
        setCurrentFeed(feedId);
        
        if (productId) {
          const foundProduct = feed.products.find(p => p.id === productId);
          if (foundProduct) {
            setProduct(foundProduct);
            // Set the first image as current if available
            if (foundProduct.pictures && foundProduct.pictures.length > 0) {
              setCurrentImage(foundProduct.pictures[0]);
            }
          } else {
            // Product not found, redirect
            navigate(`/feeds/${feedId}`);
          }
        }
      } else {
        // Feed not found, redirect to dashboard
        navigate('/');
      }
    }
  }, [feedId, productId, feeds, setCurrentFeed, navigate]);
  
  if (!product || !currentFeed) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="p-4 text-center">
          <p className="text-lg text-gray-600">Loading product data...</p>
        </div>
      </div>
    );
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let newValue: any = value;
    
    // Convert numeric fields
    if (type === 'number') {
      newValue = value === '' ? '' : Number(value);
    }
    
    // Handle checkbox
    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }
    
    setProduct({
      ...product,
      [name]: newValue
    });
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  const handleAttributeChange = (id: string, field: 'name' | 'value', newValue: string) => {
    setProduct({
      ...product,
      attributes: product.attributes.map(attr => 
        attr.id === id ? { ...attr, [field]: newValue } : attr
      )
    });
  };
  
  const handleAddAttribute = () => {
    const newAttribute: ProductAttribute = {
      id: `attr_${Date.now()}`,
      name: '',
      value: ''
    };
    
    setProduct({
      ...product,
      attributes: [...product.attributes, newAttribute]
    });
  };
  
  const handleRemoveAttribute = (id: string) => {
    setProduct({
      ...product,
      attributes: product.attributes.filter(attr => attr.id !== id)
    });
  };
  
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!product.name.trim()) {
      errors.name = 'Product name is required';
    }
    
    if (!product.price || product.price <= 0) {
      errors.price = 'Valid price is required';
    }
    
    if (!product.categoryId) {
      errors.categoryId = 'Category is required';
    }
    
    // Validate attributes
    const invalidAttributes = product.attributes.filter(
      attr => !attr.name.trim() || !attr.value.trim()
    );
    
    if (invalidAttributes.length > 0) {
      errors.attributes = 'All attributes must have both name and value';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    try {
      if (!feedId || !productId || !product) {
        throw new Error('Missing required data for saving');
      }
      
      // Проверяем, обновлены ли generatedName или generatedDescription
      const hasGeneratedContent = product.generatedName || product.generatedDescription;
      
      if (hasGeneratedContent) {
        console.log('Saving product with AI-generated content:', { 
          generatedName: product.generatedName, 
          generatedDescription: product.generatedDescription 
        });
      }
      
      // Сохраняем товар через контекст
      await updateProduct(feedId, productId, product);
      
      // Перенаправляем на страницу фида
      navigate(`/feeds/${feedId}`);
    } catch (err) {
      console.error('Error saving product:', err);
      // In a real app, we'd show an error notification
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!feedId || !productId) return;
    
    setIsDeleting(true);
    try {
      await deleteProduct(feedId, productId);
      // После успешного удаления перенаправляем на страницу фида
      navigate(`/feeds/${feedId}`);
    } catch (err) {
      console.error('Error deleting product:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };
  
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };
  
  const simulateAiEnhance = (type: 'description' | 'attributes') => {
    setAiEnhanceType(type);
    setShowAiEnhanceModal(true);
    
    // Simulating AI processing delay
    setTimeout(() => {
      if (type === 'description') {
        setEnhancedText(
          product.description ? 
          `${product.description}\n\nThis premium ${product.name} offers exceptional quality and durability. Perfect for those who value both style and functionality. Made with high-quality materials, it ensures long-lasting performance in all conditions.` :
          `The ${product.name} is a premium product designed for maximum performance and user satisfaction. Featuring high-quality components and excellent craftsmanship, this product will exceed your expectations and provide long-lasting value.`
        );
      } else {
        // For attributes, we'd show a list of suggested attributes
        setEnhancedText(JSON.stringify([
          { name: 'Material', value: 'Premium Quality' },
          { name: 'Warranty', value: '12 months' },
          { name: 'Origin', value: 'EU' }
        ], null, 2));
      }
    }, 1000);
  };
  
  const applyEnhancedText = () => {
    if (aiEnhanceType === 'description') {
      setProduct({
        ...product,
        description: enhancedText
      });
    } else if (aiEnhanceType === 'attributes') {
      try {
        const suggestedAttributes = JSON.parse(enhancedText) as Array<{name: string, value: string}>;
        
        // Filter out attributes that already exist with the same name
        const existingAttrNames = new Set(product.attributes.map(attr => attr.name.toLowerCase()));
        const newAttributes = suggestedAttributes.filter(
          attr => !existingAttrNames.has(attr.name.toLowerCase())
        ).map(attr => ({
          id: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: attr.name,
          value: attr.value
        }));
        
        setProduct({
          ...product,
          attributes: [...product.attributes, ...newAttributes]
        });
      } catch (err) {
        console.error('Error parsing attributes:', err);
      }
    }
    
    setShowAiEnhanceModal(false);
  };
  
  const handleChange = (field: string, value: any) => {
    setProduct({
      ...product,
      [field]: value
    });
  };
  
  const handleOpenModal = (imageSrc: string) => {
    const imageIndex = product.pictures?.indexOf(imageSrc) ?? 0;
    setCurrentModalImageIndex(imageIndex);
    setShowImageModal(true);
  };

  const handleCloseModal = () => {
    setShowImageModal(false);
  };

  const navigateModalImages = (direction: 'prev' | 'next') => {
    if (!product || !product.pictures || product.pictures.length === 0) return;

    let newIndex = currentModalImageIndex;
    if (direction === 'next') {
      newIndex = (currentModalImageIndex + 1) % product.pictures.length;
    } else {
      newIndex = (currentModalImageIndex - 1 + product.pictures.length) % product.pictures.length;
    }
    setCurrentModalImageIndex(newIndex);
  };
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-4 flex items-center">
        <button
          onClick={() => navigate(`/feeds/${feedId}`)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 bg-white rounded hover:bg-gray-50 text-gray-700 text-sm font-medium w-fit"
          tabIndex={0}
          aria-label="Назад к фиду"
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/feeds/${feedId}`); }}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Назад к фиду</span>
        </button>
      </div>
      
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">Edit Product</h2>
        <p className="mt-1 text-sm text-gray-500">
          Update product information and attributes
        </p>
      </div>
      
      {/* Basic Information Card */}
      <Card title="Basic Information" className="mb-4 shadow-sm">
        {/* Product ID (UUID) */}
        <Field 
          label="Product ID (UUID)" 
          htmlFor="uuid"
        >
          <input
            type="text"
            id="uuid"
            value={product.id}
            readOnly
            className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700 cursor-default"
          />
        </Field>
        {/* External ID */}
        <Field 
          label="External ID" 
          htmlFor="external-id"
        >
          <input
            type="text"
            id="external-id"
            value={product.externalId}
            readOnly
            className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700 cursor-default"
          />
        </Field>
        {/* Связанные External ID (MERGE) */}
        {Array.isArray(product.merged_external_ids) && product.merged_external_ids.length > 0 && (
          <Field label="Связанные External ID (MERGE)" htmlFor="merged-external-ids">
            <input
              id="merged-external-ids"
              type="text"
              value={Array.from(new Set(product.merged_external_ids)).join(', ')}
              readOnly
              className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700 cursor-default"
            />
          </Field>
        )}
        {/* Product Name Field */}
        <Field 
          label="Product Name" 
          htmlFor="name" 
          required 
          error={formErrors.name}
        >
          <div className="relative flex items-center">
            <input
              type="text"
              name="name"
              id="name"
              value={product.name}
              onChange={handleInputChange}
              className={`block w-full px-3 py-2 border rounded-md text-sm pr-12 ${
                formErrors.name 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } transition-colors`}
            />
            <Button
              type="button"
              aria-label="Сгенерировать название AI"
              onClick={async () => {
                if (!product) return;
                try {
                  const generatedName = await aiService.generateName(
                    product,
                    currentFeed.aiSettings?.namePrompt || undefined
                  );
                  handleChange('generatedName', generatedName);
                  handleChange('name', generatedName);
                } catch (error) {
                  console.error('Ошибка при генерации названия:', error);
                  alert('Не удалось сгенерировать название. Проверьте настройки ИИ.');
                }
              }}
              variant="ghost"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="absolute right-0 top-0 bottom-0 h-full px-3 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-r-md border-l border-gray-200"
              style={{ minWidth: 0 }}
              children={null}
            />
          </div>
          {product.generatedName && product.generatedName !== product.name && (
            <AIGenerated
              title="Сгенерированное название:"
              content={product.generatedName}
              onApply={() => handleChange('name', product.generatedName || '')}
            />
          )}
        </Field>
        
        {/* Description Field */}
        <Field 
          label="Description" 
          htmlFor="description"
        >
          <div className="relative flex items-center">
            <textarea
              id="description"
              name="description"
              rows={4}
              value={product.description || ''}
              onChange={handleInputChange}
              className={`block w-full px-3 py-2 border rounded-md text-sm pr-12 ${
                formErrors.description 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } transition-colors resize-y`}
            />
            <Button
              type="button"
              aria-label="Сгенерировать описание AI"
              onClick={async () => {
                if (!product) return;
                try {
                  const generatedDescription = await aiService.generateDescription(
                    product,
                    currentFeed.aiSettings?.descriptionPrompt || undefined
                  );
                  handleChange('generatedDescription', generatedDescription);
                  handleChange('description', generatedDescription);
                } catch (error) {
                  console.error('Ошибка при генерации описания:', error);
                  alert('Не удалось сгенерировать описание. Проверьте настройки ИИ.');
                }
              }}
              variant="ghost"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="absolute right-0 top-0 bottom-0 h-full flex items-center px-3 bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded-r-md border-l border-gray-200"
              style={{ minWidth: 0 }}
              children={null}
            />
          </div>
          
          {product.generatedDescription && product.generatedDescription !== product.description && (
            <AIGenerated
              title="Сгенерированное описание:"
              content={product.generatedDescription}
              onApply={() => handleChange('description', product.generatedDescription || '')}
              isMultiline
            />
          )}
        </Field>
      </Card>
      
      {/* Product Images Card */}
      {product.pictures && product.pictures.length > 0 && (
        <Card title="Product Images" className="mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:gap-6">
            {/* Main Image Display */}
            <div 
              className="mb-4 md:mb-0 w-full md:w-2/3 h-64 bg-gray-50 rounded-md flex items-center justify-center overflow-hidden cursor-pointer group relative border border-gray-200"
              onClick={() => {
                if (currentImage) {
                  handleOpenModal(currentImage);
                }
              }}
            >
              <img 
                src={currentImage || product.pictures[0]} 
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNNDMuNzUgNTguNUw1NC4yNSA2OUg2Mi4yNUw0OC43NSA0OS41TDQzLjc1IDU4LjVaIiBmaWxsPSIjOTRBM0IzIi8+PHBhdGggZD0iTTMxIDY5TDQzLjc1IDQ3LjVMNTYuNSA2OUgzMVoiIGZpbGw9IiM5NEEzQjMiLz48Y2lyY2xlIGN4PSI2NCIgY3k9IjM2IiByPSI1IiBmaWxsPSIjOTRBM0IzIi8+PC9zdmc+'; // Fallback SVG
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                <span className="p-2 rounded-full bg-white bg-opacity-0 group-hover:bg-opacity-70 transform scale-0 group-hover:scale-100 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* Thumbnails Grid */}
            {product.pictures.length > 1 && (
              <div className="w-full md:w-1/3">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {product.pictures.map((img, idx) => (
                    <div 
                      key={idx}
                      className={`aspect-square cursor-pointer border-2 rounded-md overflow-hidden transition-all duration-150 ease-in-out ${
                        img === (currentImage || product.pictures?.[0]) 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-200 hover:border-blue-400'
                      }`}
                      onClick={() => setCurrentImage(img)}
                    >
                      <img 
                        src={img} 
                        alt={`${product.name} - thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNNDMuNzUgNTguNUw1NC4yNSA2OUg2Mi4yNUw0OC43NSA0OS41TDQzLjc1IDU4LjVaIiBmaWxsPSIjOTRBM0IzIi8+PHBhdGggZD0iTTMxIDY5TDQzLjc1IDQ3LjVMNTYuNSA2OUgzMVoiIGZpbGw9IiM5NEEzQjMiLz48Y2lyY2xlIGN4PSI2NCIgY3k9IjM2IiByPSI1IiBmaWxsPSIjOTRBM0IzIi8+PC9zdmc+'; // Fallback SVG
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500 text-center">
                  Нажмите на изображение для просмотра в полном размере
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Pricing and Availability Card */}
      <Card title="Pricing and Availability" className="mb-4 shadow-sm">
        {/* Price Field */}
        <Field 
          label="Price" 
          htmlFor="price" 
          required 
          error={formErrors.price}
        >
          <input
            type="number"
            name="price"
            id="price"
            min="0"
            step="0.01"
            value={product.price}
            onChange={handleInputChange}
            className={`block w-full px-3 py-2 border rounded-md text-sm transition-colors ${
              formErrors.price 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          />
        </Field>
        
        {/* Old Price Field */}
        <Field 
          label="Old Price" 
          htmlFor="oldPrice"
        >
          <input
            type="number"
            name="oldPrice"
            id="oldPrice"
            min="0"
            step="0.01"
            value={product.oldPrice || ''}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
          />
        </Field>
        
        {/* Currency Field */}
        <Field 
          label="Currency" 
          htmlFor="currency"
        >
          <div className="relative">
          <select
            id="currency"
            name="currency"
            value={product.currency}
            onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors appearance-none pr-10"
          >
            <option value="RUB">RUB</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
        </Field>
        
        {/* Category Field */}
        <Field 
          label="Category" 
          htmlFor="categoryId" 
          required 
          error={formErrors.categoryId}
        >
          <div className="relative">
          <select
            id="categoryId"
            name="categoryId"
            value={product.categoryId}
            onChange={handleInputChange}
              className={`block w-full px-3 py-2 border rounded-md text-sm transition-colors appearance-none pr-10 ${
              formErrors.categoryId 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }`}
          >
            <option value="">Select a category</option>
            {currentFeed.categories.map((category: Category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
        </Field>
        
        {/* URL Field */}
        <Field 
          label="URL товара" 
          htmlFor="url"
        >
          <div className="relative flex items-center">
          <input
            type="text"
            name="url"
            id="url"
            value={product.url || ''}
            onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors pr-10"
            placeholder="https://example.com/product/123"
          />
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2 text-blue-600 hover:text-blue-800"
                title="Открыть ссылку в новой вкладке"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
          {product.generatedUrl && (
            <AIGenerated
              content={product.generatedUrl}
              onApply={() => handleChange('url', product.generatedUrl || '')}
            />
          )}
        </Field>
        
        {/* Availability Checkboxes */}
        <Field 
          label="Status"
        >
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="available"
                name="available"
                type="checkbox"
                checked={product.available}
                onChange={(e) => handleChange('available', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="available" className="ml-2 block text-sm text-gray-700">
                Товар в наличии
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="includeInExport"
                name="includeInExport"
                type="checkbox"
                checked={product.includeInExport}
                onChange={(e) => handleChange('includeInExport', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeInExport" className="ml-2 block text-sm text-gray-700">
                Включить товар в выгрузку
              </label>
            </div>
          </div>
        </Field>
      </Card>
      
      {/* Vendor Information Card */}
      <Card title="Vendor Information" className="mb-4 shadow-sm">
        {/* Vendor Field */}
        <Field 
          label="Vendor" 
          htmlFor="vendor"
        >
          <input
            type="text"
            name="vendor"
            id="vendor"
            value={product.vendor || ''}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
          />
        </Field>
        
        {/* Vendor Code Field */}
        <Field 
          label="Vendor Code" 
          htmlFor="vendorCode"
        >
          <input
            type="text"
            name="vendorCode"
            id="vendorCode"
            value={product.vendorCode || ''}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
          />
        </Field>
      </Card>
      
      {/* Product Attributes Card */}
      <Card 
        title="Product Attributes" 
        className="mb-4 shadow-sm"
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleAddAttribute}
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Attribute
            </Button>
          </div>
        }
      >
        {formErrors.attributes && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md">
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {formErrors.attributes}
            </p>
          </div>
        )}
        
        {product.attributes.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-full bg-gray-100">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <p>No attributes yet. Click "Add Attribute" to create one.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {product.attributes.map((attr) => (
              <div key={attr.id} className="flex gap-3 items-start p-2 rounded-md bg-gray-50 border border-gray-100">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Attribute name</label>
                  <input
                    type="text"
                    value={attr.name}
                    onChange={(e) => handleAttributeChange(attr.id, 'name', e.target.value)}
                    placeholder="Name"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Attribute value</label>
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => handleAttributeChange(attr.id, 'value', e.target.value)}
                    placeholder="Value"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors"
                  />
                </div>
                <div className="pt-6">
                  <Button
                    type="button"
                    onClick={() => handleRemoveAttribute(attr.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button
          type="button"
          onClick={() => navigate(`/feeds/${feedId}`)}
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Cancel
        </Button>
        
        <div className="flex space-x-2">
          <Button
            type="button"
            onClick={handleDeleteClick}
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            leftIcon={<Trash2 className="w-4 h-4" />}
            isLoading={isDeleting}
          >
            Delete
          </Button>
          
          <Button
            type="button"
            onClick={handleSave}
            variant="primary"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save
          </Button>
        </div>
      </div>
      
      {/* AI Enhancement Modal */}
      {showAiEnhanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {aiEnhanceType === 'description' ? 'Enhanced Description' : 'Suggested Attributes'}
              </h3>
              <Button
                onClick={() => setShowAiEnhanceModal(false)}
                variant="ghost"
                size="xs"
                className="text-gray-500"
                leftIcon={<X className="w-4 h-4" />}
              >
                Close
              </Button>
            </div>
            
            <div className="p-5">
              {enhancedText ? (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <p className="text-sm font-medium text-gray-700">AI generated result:</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200 text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {enhancedText}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                  <p className="text-gray-600 text-sm">Generating content with AI...</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  type="button"
                  onClick={() => setShowAiEnhanceModal(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                
                <Button
                  type="button"
                  onClick={applyEnhancedText}
                  variant="primary"
                  size="sm"
                  disabled={!enhancedText}
                  leftIcon={<Check className="w-4 h-4" />}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fullscreen Image Modal */}
      {showImageModal && product && product.pictures && product.pictures.length > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4"
          onClick={handleCloseModal} 
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] grid grid-rows-[auto_1fr_auto] overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Header with close button */}
            <div className="p-3 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {product.name} - Изображение {currentModalImageIndex + 1} из {product.pictures.length}
              </h3>
              <Button
                onClick={handleCloseModal} 
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
                leftIcon={<X className="w-5 h-5" />}
              >
                Close
              </Button>
            </div>
            
            {/* Main image container */}
            <div className="relative flex items-center justify-center overflow-hidden p-2">
              {product.pictures.length > 1 && (
                <>
                  <Button
                    onClick={() => navigateModalImages('prev')}
                    variant="outline"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full w-10 h-10 p-0 flex items-center justify-center bg-white bg-opacity-75 hover:bg-opacity-100 border-0 shadow-md"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    onClick={() => navigateModalImages('next')}
                    variant="outline"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full w-10 h-10 p-0 flex items-center justify-center bg-white bg-opacity-75 hover:bg-opacity-100 border-0 shadow-md"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </>
              )}
              
              <img 
                src={product.pictures?.[currentModalImageIndex] || ''}
                alt={`Product image ${currentModalImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            {/* Thumbnails container */}
            {product.pictures.length > 1 && (
              <div className="p-3 border-t border-gray-200 h-28 overflow-y-auto bg-gray-50">
                <div className="grid grid-flow-col auto-cols-max gap-2 overflow-x-auto px-2 justify-start">
                  {product.pictures.map((img, idx) => (
                    <div
                      key={`modal-thumb-${idx}`}
                      className={`w-16 h-16 cursor-pointer border-2 rounded-md overflow-hidden transition-all duration-150 ease-in-out ${
                        idx === currentModalImageIndex 
                          ? 'border-blue-600 ring-2 ring-blue-400' 
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                      onClick={() => setCurrentModalImageIndex(idx)}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Подтверждение удаления</h3>
            <p className="text-gray-600 mb-6">
              Вы уверены, что хотите удалить товар "{product?.name}"? Это действие необратимо.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                onClick={handleDeleteCancel}
                variant="outline"
                size="sm"
              >
                Отмена
              </Button>
              <Button
                type="button"
                onClick={handleDeleteConfirm}
                variant="primary"
                size="sm"
                isLoading={isDeleting}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Удалить товар
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductEditor;