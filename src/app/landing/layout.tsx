import type { Metadata, Viewport } from 'next';
import { SITE_URL } from '@/lib/site';

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Routyne — Entrenamiento, cuenta y sincronización',
  description:
    'Registra entrenamientos, ajusta preferencias de entrenamiento y sincroniza tu perfil cuando quieras. Sin anuncios y sin suscripción.',
  alternates: {
    canonical: '/landing',
  },
  openGraph: {
    title: 'Routyne — Entrenamiento, cuenta y sincronización',
    description: 'Registra entrenamientos, ajusta preferencias de entrenamiento y sincroniza tu perfil cuando quieras. Sin anuncios y sin suscripción.',
    url: '/landing',
    siteName: 'Routyne',
    type: 'website',
    images: [{ url: '/landing/opengraph-image', width: 1200, height: 630, alt: 'Routyne workout tracker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Routyne — Entrenamiento, cuenta y sincronización',
    description: 'Registra entrenamientos, ajusta preferencias de entrenamiento y sincroniza tu perfil cuando quieras. Sin anuncios y sin suscripción.',
    images: ['/landing/opengraph-image'],
  },
  keywords: ['workout tracker pwa', 'gym app sin suscripción', 'seguimiento de entrenamiento', 'sincronización de perfil', 'app gym privacidad'],
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <div lang="es">{children}</div>;
}
