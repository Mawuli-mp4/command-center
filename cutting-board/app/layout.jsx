import './globals.css';

export const metadata = {
  title: 'Cutting Board',
  description: 'Projects, blocks and deadlines.',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Board' },
  icons: { apple: '/icons/apple-touch-icon.png', icon: '/icons/icon-192.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1b1e23',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
