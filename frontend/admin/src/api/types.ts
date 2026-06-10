export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface AdminProduct {
  id: number;
  sku: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  categoryId: number | null;
  purchasePrice: number | null;
  purchaseCurrency: string | null;
  markupPercent: number | null;
  retailPrice: number | null;
  retailPriceManual: boolean;
  wholesalePrice: number | null;
  stockQty: number;
  reservedQty: number;
  shelf: string | null;
  adminNote: string | null;
  active: boolean;
  oemNumbers: string[];
}

export interface ProductRequest {
  sku: string;
  name: string;
  brand: string | null;
  description: string | null;
  categoryId: number | null;
  purchasePrice: number | null;
  purchaseCurrency: string | null;
  markupPercent: number | null;
  retailPrice: number | null;
  retailPriceManual: boolean;
  wholesalePrice: number | null;
  stockQty: number;
  shelf: string | null;
  adminNote: string | null;
  active: boolean;
  oemNumbers: string[];
}

export interface PhotoMeta {
  id: number;
  productId: number;
  contentType: string;
  isMain: boolean;
  sortOrder: number;
  sizeBytes: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  markupPercent: number | null;
  sortOrder: number;
  active: boolean;
  hasImage: boolean;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
  engine: string | null;
  display: string;
}

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'ASSEMBLING'
  | 'DELIVERING'
  | 'READY_FOR_PICKUP'
  | 'DONE'
  | 'CANCELLED';

export interface OrderItem {
  productId: number;
  sku: string;
  name: string;
  qty: number;
  retailPrice: number;
  wholesalePrice: number | null;
  appliedPrice: number;
}

export interface AdminOrder {
  id: number;
  number: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  email: string | null;
  deliveryMethod: 'COURIER' | 'PICKUP';
  paymentMethod: 'CASH_COURIER' | 'CARD_PICKUP' | 'CASH_PICKUP';
  comment: string | null;
  wholesale: boolean;
  discountPercent: number | null;
  discountAmount: number | null;
  deliveryFee: number;
  itemsTotal: number;
  grandTotal: number;
  cancelReason: string | null;
  viewed: boolean;
  createdAt: string;
  items: OrderItem[];
}

export interface Dashboard {
  newOrders: number;
  ordersToday: number;
  zeroStockProducts: number;
  usdRate: number | null;
  unreadChats: number;
}

export type ChatStatus = 'OPEN' | 'CLOSED';

export interface ChatSummary {
  id: number;
  visitorName: string | null;
  status: ChatStatus;
  lastMessageAt: string;
  unread: number;
  lastMessage: string;
}

export interface ChatMessage {
  id: number;
  sender: 'VISITOR' | 'ADMIN';
  body: string;
  createdAt: string;
}

export interface Rates {
  mode: 'BANK' | 'MANUAL';
  globalMarkupPercent: number | null;
  roundingRule: 'NONE' | 'TO_1' | 'TO_5';
  usd: number | null;
  eur: number | null;
}

export interface RateRow {
  currency: string;
  rate: number;
  source: 'BANK' | 'MANUAL';
  date: string;
}

export interface SnapshotMeta {
  id: number;
  createdAt: string;
  trigger: string;
  productCount: number;
}

export interface ImportPreview {
  token: string;
  toCreate: number;
  toUpdate: number;
  errors: { row: number; message: string }[];
}

export interface ImportReport {
  created: number;
  updated: number;
}

export type Settings = Record<string, string>;
