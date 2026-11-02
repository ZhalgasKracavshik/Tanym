import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, publicSupabase } from '@/lib/site';

/**
 * Серверная обёртка страницы события: сама страница клиентская, а
 * заголовок, описание и превью для WhatsApp/Telegram и Google должны быть
 * в HTML сразу. Отсюда же — разметка schema.org Event для поисковиков.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PublicEvent {
  id: string;
  title: string;
  organizer: string;
  description: string;
  starts_at: string;
  registration_deadline: string;
  location: string;
  online: boolean;
  free: boolean;
  registration_url: string | null;
  source_url: string | null;
}

async function loadEvent(id: string): Promise<PublicEvent | null> {
  if (!UUID.test(id)) return null;
  const supabase = publicSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from('published_events')
    .select('id, title, organizer, description, starts_at, registration_deadline, location, online, free, registration_url, source_url')
    .eq('id', id)
    .eq('status', 'approved')
    .maybeSingle();
  return (data as PublicEvent | null) ?? null;
}

function ruDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Almaty' }).format(
    new Date(`${iso.slice(0, 10)}T12:00:00+05:00`),
  );
}

function summary(event: PublicEvent): string {
  const parts = [`Регистрация до ${ruDate(event.registration_deadline)}`];
  if (event.organizer) parts.push(event.organizer);
  const text = event.description.replace(/\s+/g, ' ').trim();
  if (text) parts.push(text.length > 140 ? `${text.slice(0, 137)}…` : text);
  return parts.join(' · ');
}

export async function generateMetadata({ params }: LayoutProps<'/events/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const event = await loadEvent(id);
  if (!event) return { title: `Событие — ${SITE_NAME}`, robots: { index: false } };

  const description = summary(event);
  const url = `${SITE_URL}/events/${event.id}`;
  return {
    title: `${event.title} — регистрация до ${ruDate(event.registration_deadline)}`,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: event.title, description, siteName: SITE_NAME, locale: 'ru_KZ' },
    twitter: { card: 'summary_large_image', title: event.title, description },
  };
}

export default async function EventLayout({ children, params }: LayoutProps<'/events/[id]'>) {
  const { id } = await params;
  const event = await loadEvent(id);

  // schema.org/Event: по нему Google может показать дату прямо в выдаче.
  const jsonLd = event
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: event.description || summary(event),
        startDate: event.starts_at,
        eventAttendanceMode: event.online
          ? 'https://schema.org/OnlineEventAttendanceMode'
          : 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: event.online
          ? { '@type': 'VirtualLocation', url: event.registration_url ?? event.source_url ?? `${SITE_URL}/events/${event.id}` }
          : { '@type': 'Place', name: event.location || 'Казахстан', address: { '@type': 'PostalAddress', addressCountry: 'KZ' } },
        organizer: event.organizer ? { '@type': 'Organization', name: event.organizer, url: event.source_url ?? undefined } : undefined,
        offers: {
          '@type': 'Offer',
          url: event.registration_url ?? `${SITE_URL}/events/${event.id}`,
          price: event.free ? 0 : undefined,
          priceCurrency: 'KZT',
          availability: 'https://schema.org/InStock',
          validThrough: event.registration_deadline,
        },
        url: `${SITE_URL}/events/${event.id}`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify не экранирует «<»: закрывающий </script> в описании иначе разорвал бы тег.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  );
}
