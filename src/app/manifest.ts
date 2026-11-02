import type { MetadataRoute } from 'next';

/** «Добавить на главный экран» на телефоне: иконка, имя и цвет как у сайта. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Taným — афиша олимпиад и конкурсов',
    short_name: 'Taným',
    description: 'Олимпиады, конкурсы и курсы для школьников Казахстана с датой окончания регистрации.',
    start_url: '/events',
    display: 'standalone',
    background_color: '#faf9f7',
    theme_color: '#d85f2e',
    lang: 'ru',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
