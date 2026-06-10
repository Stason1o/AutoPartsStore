import type { MetadataRoute } from 'next';
import { serverGet, type CategoryNode, type Page, type ProductListItem } from '@/lib/api';
import { LOCALES } from '@/i18n/dictionaries';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sacramento.md';
const MAX_PAGES = 60; // 60 × 100 = до 6000 товаров

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    result.push(
      { url: `${SITE}/${locale}`, changeFrequency: 'daily', priority: 1 },
      { url: `${SITE}/${locale}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    );
  }
  try {
    const categories = await serverGet<CategoryNode[]>('/api/categories');
    for (const locale of LOCALES) {
      result.push(...categories.map(c => ({
        url: `${SITE}/${locale}/catalog?categoryId=${c.id}`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })));
    }

    for (let page = 0; page < MAX_PAGES; page++) {
      const products = await serverGet<Page<ProductListItem>>(`/api/products?size=100&page=${page}`);
      for (const locale of LOCALES) {
        result.push(...products.content.map(p => ({
          url: `${SITE}/${locale}/product/${p.slug}`,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })));
      }
      if (page + 1 >= products.totalPages) break;
    }
  } catch { /* бэкенд недоступен — отдаём хотя бы статические страницы */ }
  return result;
}
