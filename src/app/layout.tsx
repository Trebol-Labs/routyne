import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SITE_URL } from '@/lib/site';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
});

export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Routyne — Cuenta, sincronización y progreso',
  description: 'PWA de entrenamiento con cuenta opcional, sincronización de perfil y preferencias, y almacenamiento local en el navegador.',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Routyne — Cuenta, sincronización y progreso',
    description: 'PWA de entrenamiento con cuenta opcional, sincronización de perfil y preferencias, y almacenamiento local en el navegador.',
    url: '/',
    siteName: 'Routyne',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Routyne',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" style={{ colorScheme: 'dark' }}>
      <body
        className={`${barlowCondensed.variable} ${inter.variable} antialiased`}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
