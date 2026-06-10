import type { MetadataRoute } from 'next';
import { LOCALES } from '@/i18n/dictionaries';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sacramento.md';

export default function robots(): MetadataRoute.Robots {
  // служебные страницы без SEO-ценности — для каждой локали
  const disallow = LOCALES.flatMap(l => [`/${l}/cart`, `/${l}/checkout`, `/${l}/order/`]);
  return {
    rules: { userAgent: '*', allow: '/', disallow: [...disallow, '/api/'] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
