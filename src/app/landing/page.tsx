import Link from 'next/link';
import type { Metadata } from 'next';
import { SITE_HOST, SITE_URL } from '@/lib/site';
import { getServerLanguage } from '@/lib/i18n/server';
import { standalonePages } from '@/lib/i18n/standalone-pages';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const language = await getServerLanguage();
  const copy = standalonePages[language].landing;

  return {
    metadataBase: new URL(SITE_URL),
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
      canonical: '/landing',
    },
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      url: '/landing',
      siteName: 'Routyne',
      type: 'website',
      images: [{ url: '/landing/opengraph-image', width: 1200, height: 630, alt: 'Routyne workout tracker' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.metaTitle,
      description: copy.metaDescription,
      images: ['/landing/opengraph-image'],
    },
    keywords: [
      'workout tracker pwa',
      'gym app sin suscripción',
      'seguimiento de entrenamiento',
      'sincronización de perfil',
      'app gym privacidad',
    ],
  };
}

export default async function LandingPage() {
  const language = await getServerLanguage();
  const copy = standalonePages[language].landing;

  return (
    <div className="min-h-screen liquid-bg-dark text-white overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-black/30 backdrop-blur-xl border-b border-white/[0.06]">
        <span className="text-xl font-black tracking-tighter text-liquid font-display">ROUTYNE</span>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl active-glass-btn text-[11px] font-black uppercase tracking-widest"
        >
          {copy.openApp}
        </Link>
      </nav>

      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 gap-8 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-indigo-600/8 blur-[80px] pointer-events-none" />

        <div className="relative space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {copy.heroBadge}
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9] font-display">
            <span className="text-liquid">{copy.heroLines[0]}</span>
            <br />
            <span className="text-white">{copy.heroLines[1]}</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {copy.heroLines[2]}
            </span>
          </h1>

          <p className="text-white/50 text-base sm:text-lg font-medium max-w-lg mx-auto leading-relaxed">
            {copy.heroDescription}
          </p>
        </div>

        <div className="relative flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="px-8 py-4 rounded-2xl active-glass-btn text-sm font-black uppercase tracking-widest shadow-[0_0_40px_rgba(99,102,241,0.3)]"
          >
            {copy.ctaAction} →
          </Link>
          <a
            href="#features"
            className="px-8 py-4 rounded-2xl glass-panel border-white/10 text-sm font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors"
          >
            {copy.secondaryAction}
          </a>
        </div>

        <div className="relative grid grid-cols-3 gap-4 w-full max-w-sm">
          {copy.stats.map(({ value, label }) => (
            <div key={label} className="glass-panel rounded-2xl border-white/10 py-3 text-center">
              <p className="text-2xl font-black text-white font-display leading-none">{value}</p>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-2">
          <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">
            {copy.featuresEyebrow}
          </p>
          <h2 className="text-4xl font-black tracking-tighter font-display text-white">
            {copy.featuresTitleLead}<br />
            <span className="text-liquid">{copy.featuresTitleAccent}</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {copy.features.map(({ icon, title, body }) => (
            <div
              key={title}
              className="glass-panel rounded-2xl border-white/10 p-5 space-y-3 hover:border-white/20 transition-colors"
            >
              <span className="text-3xl">{icon}</span>
              <div className="space-y-1">
                <h3 className="text-white font-black text-sm uppercase tracking-tight font-display">{title}</h3>
                <p className="text-white/40 text-[13px] font-medium leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-2">
          <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">
            {copy.programsEyebrow}
          </p>
          <h2 className="text-4xl font-black tracking-tighter font-display text-white">
            {copy.programsTitle}
          </h2>
          <p className="text-white/40 text-sm font-medium">{copy.programsSubtitle}</p>
        </div>

        <div className="flex flex-col gap-3">
          {copy.programs.map(({ name, level, days, goal }) => (
            <div
              key={name}
              className="glass-panel rounded-2xl border-white/10 px-5 py-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl shrink-0">
                💪
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm uppercase tracking-tight font-display">{name}</p>
                <p className="text-white/30 text-[11px] font-medium mt-0.5">{goal} · {days}</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 text-white/40 shrink-0">
                {level}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-20 max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-2">
          <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em]">
            {copy.shareEyebrow}
          </p>
          <h2 className="text-4xl font-black tracking-tighter font-display text-white">
            {copy.shareTitleLead}<br />
            <span className="text-liquid">{copy.shareTitleAccent}</span>
          </h2>
          <p className="text-white/40 text-sm font-medium">
            {copy.shareDescription}
          </p>
        </div>

        <div
          className="mx-auto w-64 rounded-[1.5rem] overflow-hidden shadow-[0_0_80px_rgba(99,102,241,0.2)]"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(40px)',
          }}
        >
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">ROUTYNE</span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{copy.shareCardBadge}</span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-black text-white font-display tracking-tighter">💪 {copy.shareCardPhase}</p>
              <p className="text-white/30 text-[11px]">{copy.shareCardCompleted}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {copy.shareCardMetrics.map(({ value, label }) => (
                <div
                  key={label}
                  className="rounded-xl py-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-sm font-black text-white font-display leading-none">{value}</p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="pt-1 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/20 text-center uppercase tracking-widest">{SITE_HOST}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center max-w-xl mx-auto space-y-6 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 rounded-full bg-indigo-600/8 blur-[100px]" />
        </div>

        <div className="relative space-y-3">
          <h2 className="text-5xl font-black tracking-tighter font-display">
            <span className="text-liquid">{copy.ctaTitleLead}</span>
            <br />
            <span className="text-white">{copy.ctaTitleAccent}</span>
          </h2>
          <p className="text-white/40 text-sm font-medium">
            {copy.ctaDescription}
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl active-glass-btn text-sm font-black uppercase tracking-widest shadow-[0_0_40px_rgba(99,102,241,0.3)] relative"
        >
          {copy.openApp} →
        </Link>

        <p className="text-white/20 text-[11px] font-medium">
          {copy.ctaHint}
        </p>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-8 text-center">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-white/30">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">{copy.footerPrivacy}</Link>
          <Link href="/terms" className="hover:text-white/60 transition-colors">{copy.footerTerms}</Link>
          <Link href="/support" className="hover:text-white/60 transition-colors">{copy.footerSupport}</Link>
        </div>
        <p className="text-white/20 text-[11px] font-medium uppercase tracking-widest">
          © 2026 Routyne · {copy.footerNote}
        </p>
      </footer>
    </div>
  );
}
