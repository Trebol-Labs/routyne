import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Soporte — Routyne',
  description: 'Soporte y feedback para Routyne public beta.',
  alternates: {
    canonical: '/support',
  },
};

const sections = [
  {
    title: 'Feedback de beta',
    body: [
      'Para reportar bugs o pedir mejoras, usa GitHub Issues en github.com/Trebol-Labs/routyne/issues o responde por el canal donde recibiste la invitación a la beta.',
      'Incluye dispositivo, navegador, pasos para reproducir el problema y si el fallo ocurrió al entrar, sincronizar o importar datos.',
    ],
  },
  {
    title: 'Recuperar datos',
    body: [
      'Routyne guarda tus datos en IndexedDB del navegador. Antes de borrar datos del sitio, reinstalar el navegador o cambiar de teléfono, exporta un backup desde Cuenta y personalización > Datos y copia.',
      'Para mover datos a otro dispositivo, abre Routyne en el navegador nuevo e importa el archivo JSON desde la misma sección.',
    ],
  },
  {
    title: 'Problemas de sincronización',
    body: [
      'La sincronización con Supabase es opcional. Si algo falla, revisa el estado de la cuenta, el número de cambios pendientes y la última sincronización.',
      'Cuando reportes problemas de sincronización, indica si iniciaste sesión con magic link o con cuenta anónima y si el error aparece al abrir la app, al terminar una sesión o al cambiar de dispositivo.',
    ],
  },
];

export default function SupportPage() {
  return (
    <LegalPage
      eyebrow="Soporte"
      title="Ayuda y feedback"
      intro="La beta necesita reportes concretos: qué pasó, dónde pasó y cómo reproducirlo."
      sections={sections}
    />
  );
}
