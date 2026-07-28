import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RateStack',
    short_name: 'RateStack',
    description: 'Live gold and silver rates and direct coin purchases.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfaf7',
    theme_color: '#171411',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
