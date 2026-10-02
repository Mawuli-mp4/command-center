export default function manifest() {
  return {
    name: 'Cutting Board',
    short_name: 'Board',
    start_url: '/',
    display: 'standalone',
    background_color: '#99ecff',
    theme_color: '#99ecff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}
