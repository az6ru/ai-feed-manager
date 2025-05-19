export interface Product {
  id: string;
  name: string;
  description: string; // Описание всегда строка (нормализовано)
  price: number;
  oldPrice?: number;
  currency: string;
  categoryId: string;
  url?: string;
  generatedUrl?: string;
  includeInExport?: boolean;
  picture: string[]; // Фото всегда массив строк (нормализовано)
  vendor?: string;
  vendorCode?: string;
  available: boolean;
  attributes: ProductAttribute[];
  weight?: number;
  dimensions?: string;
  condition?: ProductCondition;
  generatedName?: string;
  generatedDescription?: string;
  mergedFromVariants?: number;
  mergedAttributes?: string[];
  [key: string]: any; // For additional YML fields
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string; // Всегда строка, даже если в исходном фиде был 0, 00, число или объект
}

export interface ProductCondition {
  type: string;
  quality?: string;
  reason?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
}

export interface FeedMetadata {
  name: string;
  company: string;
  url: string;
  date: string;
  mergedIdMap?: Record<string, string>; // карта объединённых id
}

export interface Feed {
  id: string;
  name: string;
  metadata: FeedMetadata;
  categories: Category[];
  products: Product[];
  createdAt: string;
  dateCreated: string;
  dateModified: string;
  version: string;
  source: string;
  aiSettings?: FeedAISettings;
  isPublished?: boolean;
  publishedUrl?: string;
}

export interface FeedAISettings {
  namePrompt?: string;
  descriptionPrompt?: string;
  titlePrompt?: string;
  summaryPrompt?: string;
  language?: string;
  tone?: string;
  maxTokens?: number;
}

export interface FeedHistoryEntry {
  version: number;
  timestamp: string;
  changes: string;
  author?: string;
}

export interface FeedValidationError {
  productId?: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  defaultNamePrompt: string;
  defaultDescriptionPrompt: string;
  defaultTitlePrompt: string;
  defaultSummaryPrompt: string;
  defaultLanguage: string;
  defaultTone: string;
  defaultMaxTokens: number;
}

export interface AIModel {
  id: string;
  name: string;
  maxTokens: number;
}

export interface AIGenerationResult {
  productId: string;
  generatedName?: string;
  generatedDescription?: string;
  error?: string;
}