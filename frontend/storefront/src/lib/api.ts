/** Серверные компоненты ходят напрямую в бэкенд, клиентские — через rewrite /api. */
const SERVER_API = process.env.API_URL ?? 'http://localhost:8090';

export interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  children: CategoryNode[];
}

export interface ProductListItem {
  id: number;
  sku: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number | null;
  available: number;
  mainPhotoId: number | null;
}

export interface ProductDetail extends Omit<ProductListItem, 'mainPhotoId'> {
  description: string | null;
  oemNumbers: string[];
  photoIds: number[];
  fitsVehicles: string[];
  categoryId: number | null;
  categoryName: string | null;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface VehicleCandidate {
  id: number;
  make: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
  engine: string | null;
  display: string;
}

export async function serverGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SERVER_API}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return res.json();
}

export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Ошибка ${res.status}`);
  }
  return body as T;
}

export const fmt = (n: number) => Math.round(n).toLocaleString('ru-RU');

export const photoUrl = (id: number, thumb = false) =>
  `/api/photos/${id}${thumb ? '?thumb=1' : ''}`;
