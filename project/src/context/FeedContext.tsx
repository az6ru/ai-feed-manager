import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Feed, Product } from '../types/feed';
import { parseFeedFromXml, processLargeYmlFile } from '../services/ymlParser';

interface FeedContextProps {
  feeds: Feed[];
  currentFeed: Feed | null;
  isLoading: boolean;
  error: string | null;
  addFeed: (feed: Feed) => void;
  updateFeed: (id: string, updatedFeed: Partial<Feed>) => void;
  deleteFeed: (id: string) => void;
  setCurrentFeed: (id: string | null) => void;
  importFeedFromXml: (xml: string, name: string, sourceUrl?: string) => Promise<Feed>;
  importLargeFeedFromXml: (xml: string, name: string, onProgress?: (processed: number, total: number) => void, sourceUrl?: string) => Promise<Feed>;
  updateProduct: (feedId: string, productId: string, updates: Partial<Product>) => void;
  updateProducts: (feedId: string, productIds: string[], updates: Partial<Product>) => void;
}

const FeedContext = createContext<FeedContextProps | undefined>(undefined);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [currentFeed, setCurrentFeedState] = useState<Feed | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load feeds from localStorage on init
  useEffect(() => {
    try {
      // Пробуем загрузить метаданные фидов
      const feedsMetadata = localStorage.getItem('ymlFeeds_metadata');
      if (feedsMetadata) {
        const parsedMetadata = JSON.parse(feedsMetadata);
        
        // Восстанавливаем полные данные фидов
        const restoredFeeds = parsedMetadata.map((metaFeed: any) => {
          // Загружаем продукты для этого фида, если они есть
          let products: any[] = [];
          try {
            const feedProducts = localStorage.getItem(`ymlFeeds_products_${metaFeed.id}`);
            if (feedProducts) {
              products = JSON.parse(feedProducts);
            }
          } catch (err) {
            console.warn(`Не удалось загрузить продукты для фида ${metaFeed.name}`);
          }
          
          // Загружаем категории для этого фида, если они есть
          let categories: any[] = [];
          try {
            const feedCategories = localStorage.getItem(`ymlFeeds_categories_${metaFeed.id}`);
            if (feedCategories) {
              categories = JSON.parse(feedCategories);
            }
          } catch (err) {
            console.warn(`Не удалось загрузить категории для фида ${metaFeed.name}`);
          }
          
          // Восстанавливаем полную структуру фида
          return {
            ...metaFeed,
            products: products || [],
            categories: categories || []
          };
        });
        
        setFeeds(restoredFeeds);
      } else {
        // Пробуем загрузить по старому пути для совместимости
        const savedFeeds = localStorage.getItem('ymlFeeds');
        if (savedFeeds) {
          setFeeds(JSON.parse(savedFeeds));
        }
      }
    } catch (err) {
      console.error('Failed to load feeds from localStorage', err);
    }
  }, []);

  // Save feeds to localStorage when they change
  useEffect(() => {
    try {
      // Проверяем размер данных перед сохранением
      const feedsToSave = [...feeds];
      
      // Функция для очистки фида от лишних данных
      const simplifyFeed = (feed: Feed) => {
        // Сохраняем только настройки AI и минимально необходимые данные
        const simplifiedFeed = {
          id: feed.id,
          name: feed.name,
          createdAt: feed.createdAt,
          source: feed.source,
          aiSettings: feed.aiSettings, // Обязательно сохраняем настройки AI
          metadata: feed.metadata,
          // Ограничиваем количество продуктов для хранения
          products: feed.products.slice(0, 10).map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            available: product.available,
            categoryId: product.categoryId,
            currency: product.currency,
            // Исключаем изображения и длинные описания
            generatedName: product.generatedName,
            generatedDescription: product.generatedDescription?.substring(0, 100), // Ограничиваем длину описания
            // Минимальный набор атрибутов
            attributes: product.attributes.slice(0, 3)
          })),
          // Сохраняем только основные категории
          categories: feed.categories.slice(0, 10)
        };
        
        return simplifiedFeed;
      };
      
      // Пробуем сохранить упрощенную версию
      try {
        const simplifiedFeeds = feedsToSave.map(simplifyFeed);
        
        // Разделяем данные для хранения на более мелкие части
        // Сохраняем только базовую информацию о фидах 
        const feedsMetadata = simplifiedFeeds.map(feed => ({
          id: feed.id,
          name: feed.name,
          createdAt: feed.createdAt,
          source: feed.source,
          aiSettings: feed.aiSettings, // Важно - сохраняем настройки AI
          metadata: feed.metadata
        }));
        
        // Сохраняем метаданные фидов
        localStorage.setItem('ymlFeeds_metadata', JSON.stringify(feedsMetadata));
        
        // Сохраняем продукты каждого фида отдельно
        simplifiedFeeds.forEach((feed, index) => {
          try {
            localStorage.setItem(`ymlFeeds_products_${feed.id}`, JSON.stringify(feed.products));
          } catch (err) {
            console.warn(`Не удалось сохранить продукты для фида ${feed.name}, слишком большой объем данных`);
          }
        });
        
        // Сохраняем категории каждого фида отдельно
        simplifiedFeeds.forEach((feed, index) => {
          try {
            localStorage.setItem(`ymlFeeds_categories_${feed.id}`, JSON.stringify(feed.categories));
          } catch (err) {
            console.warn(`Не удалось сохранить категории для фида ${feed.name}, слишком большой объем данных`);
          }
        });
        
        console.log('Feeds saved to localStorage (optimized version)');
      } catch (storageError) {
        console.warn('Failed to save even simplified feeds, storage quota exceeded. Saving only feed metadata without products.');
        
        // Сохраняем только метаданные фидов без продуктов
        const metadataOnly = feedsToSave.map(feed => ({
          id: feed.id,
          name: feed.name,
          createdAt: feed.createdAt,
          source: feed.source,
          aiSettings: feed.aiSettings // Важно - сохраняем настройки AI
        }));
        
        localStorage.setItem('ymlFeeds_metadata_only', JSON.stringify(metadataOnly));
      }
    } catch (err) {
      console.error('Error saving feeds to localStorage', err);
    }
  }, [feeds]);

  const addFeed = (feed: Feed) => {
    setFeeds(prevFeeds => {
      if (prevFeeds.some(f => f.id === feed.id)) {
        // Уже есть такой фид — не добавляем!
        return prevFeeds;
      }
      return [...prevFeeds, feed];
    });
  };

  const updateFeed = (id: string, updatedFeed: Partial<Feed>) => {
    console.log('updateFeed вызван с ID:', id);
    console.log('Обновляемые данные фида:', updatedFeed);
    console.log('AI настройки в обновлении:', updatedFeed.aiSettings);
    
    setFeeds(prevFeeds => 
      prevFeeds.map(feed => {
        if (feed.id === id) {
          const updated = { ...feed, ...updatedFeed };
          console.log('Обновленный фид:', updated);
          console.log('AI настройки после обновления:', updated.aiSettings);
          return updated;
        }
        return feed;
      })
    );
    
    if (currentFeed?.id === id) {
      setCurrentFeedState(prev => {
        if (!prev) return prev;
        const updated = { ...prev, ...updatedFeed };
        console.log('Обновленный текущий фид:', updated);
        console.log('AI настройки текущего фида после обновления:', updated.aiSettings);
        return updated;
      });
    }
  };

  const deleteFeed = (id: string) => {
    setFeeds(prevFeeds => prevFeeds.filter(feed => feed.id !== id));
    if (currentFeed?.id === id) {
      setCurrentFeedState(null);
    }
  };

  const setCurrentFeed = (id: string | null) => {
    if (id === null) {
      setCurrentFeedState(null);
      return;
    }
    
    const feed = feeds.find(f => f.id === id) || null;
    setCurrentFeedState(feed);
  };

  const importFeedFromXml = async (xml: string, name: string, sourceUrl?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedFeed = await parseFeedFromXml(xml, name, sourceUrl);
      if (sourceUrl) {
        parsedFeed.metadata.url = sourceUrl;
      }
      const exists = feeds.some(f => f.id === parsedFeed.id);
      if (exists) {
        updateFeed(parsedFeed.id, parsedFeed);
      } else {
        addFeed(parsedFeed);
      }
      return parsedFeed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse XML feed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const importLargeFeedFromXml = async (xml: string, name: string, onProgress?: (processed: number, total: number) => void, sourceUrl?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedFeed = await processLargeYmlFile(xml, name, 1000, onProgress, sourceUrl);
      if (sourceUrl) {
        parsedFeed.metadata.url = sourceUrl;
      }
      const exists = feeds.some(f => f.id === parsedFeed.id);
      if (exists) {
        updateFeed(parsedFeed.id, parsedFeed);
      } else {
        addFeed(parsedFeed);
      }
      return parsedFeed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse large XML feed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = (feedId: string, productId: string, updates: Partial<Product>) => {
    setFeeds(prevFeeds => 
      prevFeeds.map(feed => {
        if (feed.id !== feedId) return feed;
        
        return {
          ...feed,
          products: feed.products.map(product => 
            product.id === productId 
              ? { ...product, ...updates } 
              : product
          )
        };
      })
    );
    
    if (currentFeed?.id === feedId) {
      setCurrentFeedState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.map(product => 
            product.id === productId 
              ? { ...product, ...updates } 
              : product
          )
        };
      });
    }
  };

  const updateProducts = (feedId: string, productIds: string[], updates: Partial<Product>) => {
    setFeeds(prevFeeds => 
      prevFeeds.map(feed => {
        if (feed.id !== feedId) return feed;
        
        return {
          ...feed,
          products: feed.products.map(product => 
            productIds.includes(product.id) 
              ? { ...product, ...updates } 
              : product
          )
        };
      })
    );
    
    if (currentFeed?.id === feedId) {
      setCurrentFeedState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.map(product => 
            productIds.includes(product.id) 
              ? { ...product, ...updates } 
              : product
          )
        };
      });
    }
  };

  const value = {
    feeds,
    currentFeed,
    isLoading,
    error,
    addFeed,
    updateFeed,
    deleteFeed,
    setCurrentFeed,
    importFeedFromXml,
    importLargeFeedFromXml,
    updateProduct,
    updateProducts
  };

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (context === undefined) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
}