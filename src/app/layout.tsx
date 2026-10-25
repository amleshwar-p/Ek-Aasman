import type { Metadata, Viewport } from 'next';
import './globals.css';

// Link previews (WhatsApp, Instagram) need full URLs. On Vercel this is the production domain, so a custom
// domain added later is picked up by itself.
const site = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: 'Ek Aasmaan',
  description: 'One night sky for all of India. Light diyas, burst crackers, draw your rangoli and send your name up in a rocket this Diwali.',
  openGraph: {
    title: 'Ek Aasmaan · एक आसमान',
    description: 'Ek Bharat. Ek Aasmaan. Light up one shared Diwali sky with all of India.',
    type: 'website',
    url: '/',
    siteName: 'Ek Aasmaan',
    locale: 'en_IN'
  },
  twitter: { card: 'summary_large_image' }
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
