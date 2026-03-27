import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import '../globals.css';

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
};

export const metadata: Metadata = {
  title: 'Routyne — Fitness Tracker sin suscripción',
  description:
    'Trackea tu progreso, bate tus PRs y comparte tus logros. Gratis, offline, sin anuncios. PWA workout tracker para el gym.',
  openGraph: {
    title: 'Routyne — Fitness Tracker sin suscripción',
    description: 'Trackea tu progreso, bate tus PRs y comparte tus logros. Gratis, offline, sin anuncios.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Routyne workout tracker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Routyne — Fitness Tracker sin suscripción',
    description: 'Trackea tu progreso, bate tus PRs y comparte tus logros. Gratis, offline, sin anuncios.',
    images: ['/og-image.png'],
  },
  keywords: ['workout tracker pwa', 'gym app sin suscripción', 'fitness tracker offline', 'seguimiento de entrenamiento gratis', 'app gym privacidad'],
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" style={{ colorScheme: 'dark' }}>
      <body className={`${barlowCondensed.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
