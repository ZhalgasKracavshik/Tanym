import type { MetadataRoute } from 'next';
import { SITE_URL, publicSupabase } from '@/lib/site';

/** Пересобираем раз в час: новые события попадают в sitemap без деплоя. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/events`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/register`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const supabase = publicSupabase();
  if (!supabase) return pages;

  // Прошедшие события тоже оставляем: по ним ищут «как было в прошлом году».
  const { data } = await supabase
    .from('published_events')
    .select('id, created_at, reviewed_at, verified_at')
    .eq('status', 'approved')
    .order('registration_deadline', { ascending: false })
    .limit(1000);

  for (const event of data ?? []) {
    const updated = event.verified_at ?? event.reviewed_at ?? event.created_at;
    pages.push({
      url: `${SITE_URL}/events/${event.id}`,
      lastModified: updated ? new Date(updated) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }
  return pages;
}
