import type { AppLanguage } from '@/types/workout';

export interface LandingFeatureCopy {
  icon: string;
  title: string;
  body: string;
}

export interface LandingProgramCopy {
  name: string;
  level: string;
  days: string;
  goal: string;
}

export interface LandingMetricCopy {
  value: string;
  label: string;
}

export interface LandingCopy {
  metaTitle: string;
  metaDescription: string;
  heroBadge: string;
  heroLines: [string, string, string];
  heroDescription: string;
  openApp: string;
  secondaryAction: string;
  featuresEyebrow: string;
  featuresTitleLead: string;
  featuresTitleAccent: string;
  features: LandingFeatureCopy[];
  programsEyebrow: string;
  programsTitle: string;
  programsSubtitle: string;
  programs: LandingProgramCopy[];
  shareEyebrow: string;
  shareTitleLead: string;
  shareTitleAccent: string;
  shareDescription: string;
  shareCardBadge: string;
  shareCardPhase: string;
  shareCardSession: string;
  shareCardCompleted: string;
  shareCardMetrics: LandingMetricCopy[];
  ctaTitleLead: string;
  ctaTitleAccent: string;
  ctaDescription: string;
  ctaAction: string;
  ctaHint: string;
  footerNote: string;
  footerPrivacy: string;
  footerTerms: string;
  footerSupport: string;
  footerHome: string;
  footerApp: string;
  stats: LandingMetricCopy[];
}

export interface LegalSectionCopy {
  title: string;
  body: string[];
}

export interface LegalPageCopy {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSectionCopy[];
}

export interface LegalLabelsCopy {
  openApp: string;
  privacy: string;
  terms: string;
  support: string;
  home: string;
}

export interface StandalonePagesCopy {
  landing: LandingCopy;
  legalLabels: LegalLabelsCopy;
  privacy: LegalPageCopy;
  terms: LegalPageCopy;
  support: LegalPageCopy;
}

export const standalonePages: Record<AppLanguage, StandalonePagesCopy> = {
  es: {
    landing: {
      metaTitle: 'Routyne — Entrenamiento, cuenta y sincronización',
      metaDescription:
        'Registra entrenamientos, ajusta preferencias de entrenamiento y sincroniza tu perfil cuando quieras. Sin anuncios y sin suscripción.',
      heroBadge: 'PWA · Sincronización opcional · Gratis',
      heroLines: ['ENTRENA.', 'PROGRESA.', 'DOMINA.'],
      heroDescription:
        'El tracker para entrenar, ajustar tus preferencias y recuperar tu perfil entre dispositivos sin perder el flujo.',
      openApp: 'Abrir app',
      secondaryAction: 'Ver funciones',
      featuresEyebrow: 'Funciones',
      featuresTitleLead: 'Todo lo que necesitas.',
      featuresTitleAccent: 'Sin fricción.',
      features: [
        {
          icon: '👤',
          title: 'Cuenta y sincronización',
          body: 'Entra con email o cuenta anónima, revisa cambios pendientes y conserva tu perfil entre dispositivos.',
        },
        {
          icon: '🎯',
          title: 'Preferencias de entrenamiento',
          body: 'Ajusta objetivo, tono del coach, días de descanso y ritmo de trabajo.',
        },
        {
          icon: '⚡',
          title: 'Registro rápido',
          body: 'Loguea series con taps, chips, steppers y entradas numéricas sin abrir menús pesados.',
        },
        {
          icon: '📊',
          title: 'Analíticas reales',
          body: 'Ve volumen, rachas, peso corporal y progreso sin ruido.',
        },
        {
          icon: '🎨',
          title: 'Apariencia adaptable',
          body: 'Cambia acento y movimiento sin romper el estilo glass.',
        },
        {
          icon: '🗂️',
          title: 'Copia y recuperación',
          body: 'Exporta o importa datos locales cuando necesites mover tu historial.',
        },
      ],
      programsEyebrow: 'Programas incluidos',
      programsTitle: 'Empieza con una base sólida.',
      programsSubtitle: '5 programas probados listos para usar',
      programs: [
        { name: 'Starting Strength', level: 'Principiante', days: '3d/sem', goal: 'Fuerza' },
        { name: 'Upper/Lower Split', level: 'Intermedio', days: '4d/sem', goal: 'Hipertrofia' },
        { name: '5/3/1 Wendler', level: 'Intermedio', days: '4d/sem', goal: 'Fuerza' },
        { name: 'Push Pull Legs', level: 'Intermedio', days: '6d/sem', goal: 'Hipertrofia' },
        { name: 'Arnold Split', level: 'Avanzado', days: '6d/sem', goal: 'Hipertrofia' },
      ],
      shareEyebrow: 'Comparte tu progreso',
      shareTitleLead: 'Muestra al mundo',
      shareTitleAccent: 'lo que lograste.',
      shareDescription:
        'Genera una tarjeta con tu sesión, PRs y volumen. Compártela en Instagram, WhatsApp o donde quieras.',
      shareCardBadge: 'Empuje',
      shareCardPhase: 'Sesión',
      shareCardSession: 'Completado · 47 min',
      shareCardCompleted: 'Completado',
      shareCardMetrics: [
        { value: '5', label: 'Series' },
        { value: '2.840', label: 'Vol kg' },
        { value: '1', label: 'PR' },
      ],
      ctaTitleLead: 'EMPIEZA',
      ctaTitleAccent: 'HOY.',
      ctaDescription: 'Sin registro. Sin tarjeta. Instala como app en tu móvil.',
      ctaAction: 'Abrir Routyne',
      ctaHint: 'Abre en Chrome (Android) o Safari (iOS) → Agregar a pantalla de inicio',
      footerNote: 'Hecho con 💪 · Sin suscripción',
      footerPrivacy: 'Privacidad',
      footerTerms: 'Términos',
      footerSupport: 'Soporte',
      footerHome: 'Inicio',
      footerApp: 'Abrir app',
      stats: [
        { value: '100+', label: 'Ejercicios' },
        { value: '5', label: 'Programas' },
        { value: '0', label: 'Suscripción' },
      ],
    },
    legalLabels: {
      openApp: 'Abrir app',
      privacy: 'Privacidad',
      terms: 'Términos',
      support: 'Soporte',
      home: 'Inicio',
    },
    privacy: {
      eyebrow: 'Privacidad',
      title: 'Tus datos primero',
      intro: 'Routyne prioriza tu control: puedes usar la app sin cuenta, sin pagos y sin telemetría de producto.',
      sections: [
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
      ],
    },
    terms: {
      eyebrow: 'Términos',
      title: 'Condiciones de beta',
      intro: 'Estos términos describen cómo usar Routyne durante la beta pública gratuita.',
      sections: [
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
      ],
    },
    support: {
      eyebrow: 'Soporte',
      title: 'Ayuda y feedback',
      intro: 'La beta necesita reportes concretos: qué pasó, dónde pasó y cómo reproducirlo.',
      sections: [
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
      ],
    },
  },
  en: {
    landing: {
      metaTitle: 'Routyne — Training, account, and sync',
      metaDescription:
        'Log workouts, tune training preferences, and sync your profile whenever you want. No ads and no subscription.',
      heroBadge: 'PWA · Optional sync · Free',
      heroLines: ['LIFT.', 'LOG.', 'PROGRESS.'],
      heroDescription:
        'The tracker to train, tune your preferences, and recover your profile across devices without losing momentum.',
      openApp: 'Open app',
      secondaryAction: 'View features',
      featuresEyebrow: 'Features',
      featuresTitleLead: 'Everything you need.',
      featuresTitleAccent: 'No friction.',
      features: [
        {
          icon: '👤',
          title: 'Account and sync',
          body: 'Sign in with email or an anonymous account, review pending changes, and keep your profile across devices.',
        },
        {
          icon: '🎯',
          title: 'Training preferences',
          body: 'Adjust your goal, coach tone, rest days, and work pace.',
        },
        {
          icon: '⚡',
          title: 'Fast logging',
          body: 'Log sets with taps, chips, steppers, and numeric input without opening heavy menus.',
        },
        {
          icon: '📊',
          title: 'Real analytics',
          body: 'See volume, streaks, bodyweight, and progress without noise.',
        },
        {
          icon: '🎨',
          title: 'Adaptive appearance',
          body: 'Change accent and motion without breaking the glass style.',
        },
        {
          icon: '🗂️',
          title: 'Backup and recovery',
          body: 'Export or import local data whenever you need to move your history.',
        },
      ],
      programsEyebrow: 'Included programs',
      programsTitle: 'Start with a solid base.',
      programsSubtitle: '5 proven programs ready to use',
      programs: [
        { name: 'Starting Strength', level: 'Beginner', days: '3d/wk', goal: 'Strength' },
        { name: 'Upper/Lower Split', level: 'Intermediate', days: '4d/wk', goal: 'Hypertrophy' },
        { name: '5/3/1 Wendler', level: 'Intermediate', days: '4d/wk', goal: 'Strength' },
        { name: 'Push Pull Legs', level: 'Intermediate', days: '6d/wk', goal: 'Hypertrophy' },
        { name: 'Arnold Split', level: 'Advanced', days: '6d/wk', goal: 'Hypertrophy' },
      ],
      shareEyebrow: 'Show your progress',
      shareTitleLead: 'Show the world',
      shareTitleAccent: 'what you achieved.',
      shareDescription:
        'Generate a card with your session, PRs, and volume. Share it on Instagram, WhatsApp, or anywhere you like.',
      shareCardBadge: 'Push',
      shareCardPhase: 'Session',
      shareCardCompleted: 'Completed · 47 min',
      shareCardSession: 'Session',
      shareCardMetrics: [
        { value: '5', label: 'Sets' },
        { value: '2.840', label: 'Vol kg' },
        { value: '1', label: 'PR' },
      ],
      ctaTitleLead: 'START',
      ctaTitleAccent: 'TODAY.',
      ctaDescription: 'No signup. No card. Install it like an app on your phone.',
      ctaAction: 'Open Routyne',
      ctaHint: 'Open in Chrome (Android) or Safari (iOS) → Add to home screen',
      footerNote: 'Made with 💪 · No subscription',
      footerPrivacy: 'Privacy',
      footerTerms: 'Terms',
      footerSupport: 'Support',
      footerHome: 'Home',
      footerApp: 'Open app',
      stats: [
        { value: '100+', label: 'Exercises' },
        { value: '5', label: 'Programs' },
        { value: '0', label: 'Subscription' },
      ],
    },
    legalLabels: {
      openApp: 'Open app',
      privacy: 'Privacy',
      terms: 'Terms',
      support: 'Support',
      home: 'Home',
    },
    privacy: {
      eyebrow: 'Privacy',
      title: 'Your data first',
      intro: 'Routyne puts you in control: use the app without an account, without payments, and without product telemetry.',
      sections: [
        {
          title: 'Local data',
          body: [
            'Routyne stores your routines, sessions, history, profile, preferences, and bodyweight in IndexedDB inside your browser.',
            'You can export a JSON backup from Account & customization to keep a copy or move your data to another device.',
          ],
        },
        {
          title: 'Optional sync',
          body: [
            'If you enable sync, Routyne uses Supabase to authenticate you and sync your profile, preferences, and compatible data across devices.',
            'Supabase processes the data needed to provide sync. If you do not enable it, your data stays in the browser.',
          ],
        },
        {
          title: 'No telemetry',
          body: [
            'This beta does not include product analytics, ad pixels, or behavioral tracking. We also do not sell personal data.',
            'Normal hosting and API requests may generate minimal operational logs, such as errors or access to endpoints needed for the app to function.',
          ],
        },
        {
          title: 'Exercise media',
          body: [
            'Exercise media search uses ExerciseDB through RapidAPI. When a card needs media, the exercise name may be sent to that provider to resolve an image, GIF, or video.',
          ],
        },
      ],
    },
    terms: {
      eyebrow: 'Terms',
      title: 'Beta terms',
      intro: 'These terms explain how to use Routyne during the free public beta.',
      sections: [
        {
          title: 'Free beta',
          body: [
            'Routyne is offered as a free public beta. There are no payments, subscriptions, or promises of permanent availability at this stage.',
            'The app may change while bugs are fixed, the experience is tuned, and the stable version takes shape.',
          ],
        },
        {
          title: 'Responsible use',
          body: [
            'Routyne records workouts and progress, but it does not replace medical, physiotherapy, or professional coaching advice.',
            'You are responsible for checking your routines, loads, and technique, and for stopping if a session causes pain or risk.',
          ],
        },
        {
          title: 'Data and backups',
          body: [
            'Your data is stored in the browser and you can export a backup whenever you want to keep an extra copy.',
            'If you enable Supabase sync, you accept that this data is processed to authenticate you and sync the app across devices.',
          ],
        },
        {
          title: 'Changes',
          body: [
            'We may update these terms during the beta. The effective date is the version published on this site.',
          ],
        },
      ],
    },
    support: {
      eyebrow: 'Support',
      title: 'Help and feedback',
      intro: 'The beta needs concrete reports: what happened, where it happened, and how to reproduce it.',
      sections: [
        {
          title: 'Beta feedback',
          body: [
            'To report bugs or request improvements, use GitHub Issues at github.com/Trebol-Labs/routyne/issues or reply through the channel where you received the beta invite.',
            'Include device, browser, steps to reproduce the problem, and whether it happened when signing in, syncing, or importing data.',
          ],
        },
        {
          title: 'Recover data',
          body: [
            'Routyne keeps your data in the browser IndexedDB. Before clearing site data, reinstalling the browser, or switching phones, export a backup from Account & customization > Data & backup.',
            'To move data to another device, open Routyne there and import the JSON file from the same section.',
          ],
        },
        {
          title: 'Sync issues',
          body: [
            'Supabase sync is optional. If something fails, check account status, pending changes, and the latest sync.',
            'When reporting sync issues, mention whether you signed in with magic link or an anonymous account and whether the error appears when opening the app, finishing a session, or switching devices.',
          ],
        },
      ],
    },
  },
} as const;
