import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Feed, Product } from '../types/feed';
import { parseFeedFromXml, processLargeYmlFile } from '../services/ymlParser';
import { useAuth } from './AuthContext';
import {
  getFeeds,
  createFeed,
  updateFeed as updateFeedSupabase,
  deleteFeed as deleteFeedSupabase,
  getProducts,
  createProduct,
  updateProduct as updateProductSupabase,
  deleteProduct as deleteProductSupabase,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  batchInsertProducts,
  batchInsertCategories,
  updateFeedCounters
} from '../services/supabaseClient';

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
  updateProduct: (feedId: string, productIdentifier: string, updates: Partial<Product>) => void;
  updateProducts: (feedId: string, productExternalIds: string[], updates: Partial<Product>) => void;
  deleteProduct: (feedId: string, productId: string) => Promise<void>;
}

const FeedContext = createContext<FeedContextProps | undefined>(undefined);

export function FeedProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [currentFeed, setCurrentFeedState] = useState<Feed | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка фидов из Supabase при инициализации и смене пользователя
  useEffect(() => {
    if (!user) {
      console.error('User is not authenticated:', user);
      return;
    }
    
    console.log('Loading feeds for user:', user.id);
    
    setIsLoading(true);
    getFeeds(user.id)
      .then((feedsFromDb) => {
        console.log('Feeds loaded:', feedsFromDb.length);
        setFeeds(feedsFromDb); // только метаданные и счетчики
      })
      .catch((err) => {
        console.error('Error loading feeds:', err);
        setError(err.message || 'Ошибка загрузки фидов');
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  // --- CRUD фидов ---
  const addFeed = async (feed: Feed) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { products = [], categories = [], ...feedData } = feed;
      const created = await createFeed({ ...feedData, userId: user.id });
      await batchInsertCategories(categories, created.id);
      await batchInsertProducts(products, created.id);
      await updateFeedCounters(created.id);
      setFeeds(prev => [...prev, { ...created, products_count: products.length, categories_count: categories.length }]);
    } catch (e: any) {
      setError(e.message || 'Ошибка при добавлении фида');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFeed = async (id: string, updatedFeed: Partial<Feed>) => {
    setIsLoading(true);
    try {
      // Исключаем products и categories из объекта для Supabase
      const { products, categories, ...feedData } = updatedFeed;
      const updated = await updateFeedSupabase(id, feedData);
      setFeeds(prev => prev.map(f => f.id === id ? { ...f, ...updated } : f));
      if (currentFeed?.id === id) setCurrentFeedState(prev => prev ? { ...prev, ...updated } : prev);
      // (опционально) можно реализовать обновление продуктов и категорий отдельно
    } catch (e: any) {
      setError(e.message || 'Ошибка при обновлении фида');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFeed = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteFeedSupabase(id);
      setFeeds(prev => prev.filter(f => f.id !== id));
      if (currentFeed?.id === id) setCurrentFeedState(null);
    } catch (e: any) {
      setError(e.message || 'Ошибка при удалении фида');
    } finally {
      setIsLoading(false);
    }
  };

  const setCurrentFeed = async (id: string | null) => {
    if (id === null) {
      setCurrentFeedState(null);
      return;
    }
    let feed = feeds.find(f => f.id === id) || null;
    if (!feed) {
      setCurrentFeedState(null);
      return;
    }
    // Если уже есть товары и категории — просто ставим
    if (feed.products && feed.categories) {
      setCurrentFeedState(feed);
      
      // Сохраняем текущий URL в localStorage
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('currentUrl', currentPath);
      
      return;
    }
    setIsLoading(true);
    try {
      const [products, categories] = await Promise.all([
        getProducts(feed.id),
        getCategories(feed.id)
      ]);
      feed = { ...feed, products, categories };
      setFeeds(prev => prev.map(f => f.id === id ? { ...f, products, categories } : f));
      setCurrentFeedState(feed);
      
      // Сохраняем текущий URL в localStorage
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('currentUrl', currentPath);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки товаров/категорий');
    } finally {
      setIsLoading(false);
    }
  };

  // --- CRUD продуктов ---
  const updateProduct = async (feedId: string, productIdentifier: string, updates: Partial<Product>) => {
    setIsLoading(true);
    try {
      // Находим продукт по id или externalId
      const feed = feeds.find(f => f.id === feedId);
      if (!feed) throw new Error('Feed not found');

      // Сначала ищем по id (UUID), затем по externalId
      let product = feed.products.find(p => p.id === productIdentifier);
      if (!product) {
        product = feed.products.find(p => p.externalId === productIdentifier);
      }
      
      if (!product) throw new Error('Product not found');
      
      // Подготавливаем данные для обновления
      const updatesToSave = { ...updates };
      
      // Сохраняем сгенерированные AI поля, если они есть
      if (updatesToSave.generatedName !== undefined || updatesToSave.generatedDescription !== undefined) {
        // Просто проверяем наличие полей, сами данные уже включены в updatesToSave
        console.log('Сохраняем AI-генерированный контент для продукта:', product.id);
      }
      
      const updated = await updateProductSupabase(product.id, updatesToSave);
      
      setFeeds(prev => prev.map(feed =>
        feed.id !== feedId ? feed : {
          ...feed,
          products: feed.products.map(p => p.id === product?.id ? { ...p, ...updated } : p)
        }
      ));
      
      if (currentFeed?.id === feedId) setCurrentFeedState(prev => prev ? {
        ...prev,
        products: prev.products.map(p => p.id === product?.id ? { ...p, ...updates } : p)
      } : prev);
    } catch (e: any) {
      setError(e.message || 'Ошибка при обновлении товара');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProducts = async (feedId: string, productExternalIds: string[], updates: Partial<Product>) => {
    setIsLoading(true);
    try {
      // Находим id всех продуктов по externalId
      const feed = feeds.find(f => f.id === feedId);
      if (!feed) throw new Error('Feed not found');
      
      const productsToUpdate = feed.products.filter(p => productExternalIds.includes(p.externalId));
      if (productsToUpdate.length === 0) throw new Error('No products found to update');
      
      // Подготавливаем данные для обновления
      const updatesToSave = { ...updates };
      
      // Сохраняем сгенерированные AI поля, если они есть
      if (updatesToSave.generatedName !== undefined || updatesToSave.generatedDescription !== undefined) {
        // Просто проверяем наличие полей, сами данные уже включены в updatesToSave
        console.log('Сохраняем AI-генерированный контент для', productsToUpdate.length, 'продуктов');
      }
      
      // Обновляем все товары
      const ids = productsToUpdate.map(p => p.id);
      await Promise.all(ids.map(id => updateProductSupabase(id, updatesToSave)));
      
      // Обновляем локальное состояние
      setFeeds(prev => prev.map(feed =>
        feed.id !== feedId ? feed : {
          ...feed,
          products: feed.products.map(p => productExternalIds.includes(p.externalId) ? { ...p, ...updates } : p)
        }
      ));
      
      if (currentFeed?.id === feedId) setCurrentFeedState(prev => prev ? {
        ...prev,
        products: prev.products.map(p => productExternalIds.includes(p.externalId) ? { ...p, ...updates } : p)
      } : prev);
    } catch (e: any) {
      setError(e.message || 'Ошибка при обновлении товаров');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (feedId: string, productId: string) => {
    setIsLoading(true);
    try {
      // Находим продукт по id
      const feed = feeds.find(f => f.id === feedId);
      if (!feed) throw new Error('Feed not found');
      
      const product = feed.products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');
      
      // Удаляем продукт из Supabase
      await deleteProductSupabase(productId);
      
      // Обновляем локальное состояние
      setFeeds(prev => prev.map(feed =>
        feed.id !== feedId ? feed : {
          ...feed,
          products: feed.products.filter(p => p.id !== productId)
        }
      ));
      
      // Обновляем текущий фид, если это он
      if (currentFeed?.id === feedId) {
        setCurrentFeedState(prev => prev ? {
          ...prev,
          products: prev.products.filter(p => p.id !== productId)
        } : prev);
      }
      
      // Обновляем счетчик товаров
      await updateFeedCounters(feedId);
    } catch (e: any) {
      setError(e.message || 'Ошибка при удалении товара');
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const importFeedFromXml = async (xml: string, name: string, sourceUrl?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedFeed = await parseFeedFromXml(xml, name, sourceUrl);
      if (sourceUrl) {
        parsedFeed.metadata.url = sourceUrl;
      }
      // Не обновляем и не добавляем фид автоматически!
      // const exists = feeds.some(f => f.id === parsedFeed.id);
      // if (exists) {
      //   updateFeed(parsedFeed.id, parsedFeed);
      // } else {
      //   addFeed(parsedFeed);
      // }
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
      // Не обновляем и не добавляем фид автоматически!
      // const exists = feeds.some(f => f.id === parsedFeed.id);
      // if (exists) {
      //   updateFeed(parsedFeed.id, parsedFeed);
      // } else {
      //   addFeed(parsedFeed);
      // }
      return parsedFeed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse large XML feed');
      throw err;
    } finally {
      setIsLoading(false);
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
    updateProducts,
    deleteProduct
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