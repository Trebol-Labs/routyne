import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Privacidad — Routyne',
  description: 'Política de privacidad de Routyne public beta.',
  alternates: {
    canonical: '/privacy',
  },
};

const sections = [
  {
    title: 'Datos locales',
    body: [
      'Routyne guarda tus rutinas, sesiones, historial, perfil, preferencias y peso corporal en IndexedDB dentro de tu navegador.',
      'Puedes exportar un backup JSON desde Cuenta y personalización para guardar una copia o mover tus datos a otro dispositivo.',
    ],
  },
  {
    title: 'Sincronización opcional',
    body: [
      'Si activas sincronización, Routyne usa Supabase para autenticarte y sincronizar perfil, preferencias y datos compatibles entre dispositivos.',
      'Supabase procesa los datos necesarios para prestar el servicio de sincronización. Si no activas esa función, tus datos permanecen en el navegador.',
    ],
  },
  {
    title: 'Sin telemetría',
    body: [
      'En esta beta no agregamos analítica de producto, pixels publicitarios ni tracking de comportamiento. Tampoco vendemos datos personales.',
      'Las solicitudes técnicas normales del hosting y APIs pueden generar logs operativos mínimos, por ejemplo errores o acceso a endpoints necesarios para que la app funcione.',
    ],
  },
  {
    title: 'Medios de ejercicios',
    body: [
      'La búsqueda de media para ejercicios usa ExerciseDB a través de RapidAPI. Cuando una tarjeta necesita media, el nombre del ejercicio puede enviarse a ese proveedor para resolver imagen, GIF o video.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidad"
      title="Tus datos primero"
      intro="Routyne prioriza tu control: puedes usar la app sin cuenta, sin pagos y sin telemetría de producto."
      sections={sections}
    />
  );
}
