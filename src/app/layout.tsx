import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ek Aasmaan',
  description: 'One night sky for all of India. Light diyas, burst crackers, draw your rangoli and send your name up in a rocket this Diwali.',
  openGraph: {
    title: 'Ek Aasmaan · एक आसमान',
    description: 'Ek Bharat. Ek Aasmaan. Light up one shared Diwali sky with all of India.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#07060F'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mukta:wght@300;400;500;600;700&family=Tiro+Devanagari+Hindi:ital@0;1&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
