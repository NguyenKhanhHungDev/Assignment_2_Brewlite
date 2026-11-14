import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'BrewLite', short_name: 'BrewLite', lang: 'vi',
    description: 'Cà phê thủ công và thức uống nhận tại quầy BrewLite.',
    start_url: '/', scope: '/', display: 'standalone',
    theme_color: '#2f1d16', background_color: '#fbf8f3',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
