import type { MetadataRoute } from 'next';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sacramento.md';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // служебные страницы без SEO-ценности
      disallow: ['/cart', '/checkout', '/order/', '/api/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
