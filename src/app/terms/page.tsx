import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Términos — Routyne',
  description: 'Términos de uso de Routyne public beta.',
  alternates: {
    canonical: '/terms',
  },
};

const sections = [
  {
    title: 'Beta gratuita',
    body: [
      'Routyne se ofrece como public beta gratuita. No hay pagos, suscripciones ni promesas de disponibilidad permanente durante esta etapa.',
      'La app puede cambiar mientras se corrigen errores, se ajusta la experiencia y se decide qué entra en una versión estable.',
    ],
  },
  {
    title: 'Uso responsable',
    body: [
      'Routyne registra entrenamientos y progreso, pero no reemplaza asesoría médica, fisioterapéutica ni de entrenamiento profesional.',
      'Eres responsable de revisar tus rutinas, cargas y técnica, y de parar si una sesión produce dolor o riesgo.',
    ],
  },
  {
    title: 'Datos y backups',
    body: [
      'Tus datos se guardan en el navegador y puedes exportar un backup cuando quieras conservar una copia adicional.',
      'Si activas sincronización con Supabase, aceptas que esos datos se procesen para autenticarte y sincronizar la app entre dispositivos.',
    ],
  },
  {
    title: 'Cambios',
    body: [
      'Podemos actualizar estos términos durante la beta. La fecha efectiva será la de la versión publicada en este sitio.',
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Términos"
      title="Condiciones de beta"
      intro="Estos términos describen cómo usar Routyne durante la beta pública gratuita."
      sections={sections}
    />
  );
}
