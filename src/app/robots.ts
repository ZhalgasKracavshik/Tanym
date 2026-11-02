import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Поисковикам — публичная часть: лендинг, афиша, события. Личные кабинеты и API закрыты. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/events', '/events/'],
      disallow: [
        '/api/',
        '/admin',
        '/auth/',
        '/dashboard',
        '/profile',
        '/onboarding',
        '/settings',
        '/events/new',
        '/reset-password',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
