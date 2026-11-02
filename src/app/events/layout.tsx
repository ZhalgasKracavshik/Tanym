import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Афиша олимпиад, конкурсов и курсов для школьников — Taným',
  description:
    'Олимпиады, конкурсы, хакатоны и курсы для школьников Казахстана с датой окончания регистрации. Фильтр по классу, напоминания о дедлайнах.',
  alternates: { canonical: `${SITE_URL}/events` },
};

export default function EventsLayout({ children }: LayoutProps<'/events'>) {
  return children;
}
