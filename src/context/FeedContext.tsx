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
  batchInsertCategories
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
  updateProduct: (feedId: string, productExternalId: string, updates: Partial<Product>) => void;
  updateProducts: (feedId: string, productExternalIds: string[], updates: Partial<Product>) => void;
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
    if (!user) return;
    setIsLoading(true);
    getFeeds(user.id)
      .then(async (feedsFromDb) => {
        // Для каждого фида подтягиваем продукты и категории
        const feedsWithData = await Promise.all(
          feedsFromDb.map(async (feed: any) => {
            const [products, categories] = await Promise.all([
              getProducts(feed.id),
              getCategories(feed.id)
            ]);
            return { ...feed, products, categories };
          })
        );
        setFeeds(feedsWithData);
      })
      .catch((err) => setError(err.message || 'Ошибка загрузки фидов'))
      .finally(() => setIsLoading(false));
  }, [user]);

  // --- CRUD фидов ---
  const addFeed = async (feed: Feed) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Исключаем products и categories из объекта для Supabase
      const { products = [], categories = [], ...feedData } = feed;
      const created = await createFeed({ ...feedData, userId: user.id });
      // Батчем категории
      await batchInsertCategories(categories, created.id);
      // Батчем продукты
      await batchInsertProducts(products, created.id);
      setFeeds(prev => [...prev, { ...created, products, categories }]);
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

  const setCurrentFeed = (id: string | null) => {
    if (id === null) {
      setCurrentFeedState(null);
      return;
    }
    const feed = feeds.find(f => f.id === id) || null;
    setCurrentFeedState(feed);
  };

  // --- CRUD продуктов ---
  const updateProduct = async (feedId: string, productExternalId: string, updates: Partial<Product>) => {
    setIsLoading(true);
    try {
      // Находим продукт по externalId
      const product = feeds.find(f => f.id === feedId)?.products.find(p => p.externalId === productExternalId);
      if (!product) throw new Error('Product not found');
      const updated = await updateProductSupabase(product.id, updates);
      setFeeds(prev => prev.map(feed =>
        feed.id !== feedId ? feed : {
          ...feed,
          products: feed.products.map(p => p.externalId === productExternalId ? { ...p, ...updated } : p)
        }
      ));
      if (currentFeed?.id === feedId) setCurrentFeedState(prev => prev ? {
        ...prev,
        products: prev.products.map(p => p.externalId === productExternalId ? { ...p, ...updates } : p)
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
      const ids = feed.products.filter(p => productExternalIds.includes(p.externalId)).map(p => p.id);
      await Promise.all(ids.map(id => updateProductSupabase(id, updates)));
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