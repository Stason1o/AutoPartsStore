import type { MetadataRoute } from 'next';
import { serverGet, type Page, type ProductListItem } from '@/lib/api';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sacramento.md';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/catalog`, changeFrequency: 'daily', priority: 0.9 },
  ];
  try {
    const products = await serverGet<Page<ProductListItem>>('/api/products?size=100&page=0');
    return [
      ...base,
      ...products.content.map(p => ({
        url: `${SITE}/product/${p.slug}`,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return base;
  }
}
