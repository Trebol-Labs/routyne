import Link from 'next/link';

interface LegalSection {
  title: string;
  body: string[];
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
}

export function LegalPage({ eyebrow, title, intro, sections }: LegalPageProps) {
  return (
    <main className="min-h-[100dvh] liquid-bg-dark text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-5 py-8 sm:px-8">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/landing" className="font-display text-xl font-black tracking-tighter text-liquid">
            ROUTYNE
          </Link>
          <Link
            href="/"
            className="active-glass-btn rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest"
          >
            Abrir app
          </Link>
        </nav>

        <article className="flex-1 py-12 sm:py-16">
          <div className="mb-10 space-y-4">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-300/80">
              {eyebrow}
            </p>
            <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tighter sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-7 text-white/55 sm:text-base">
              {intro}
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="glass-panel rounded-2xl border-white/10 p-5 sm:p-6">
                <h2 className="mb-3 font-display text-lg font-black uppercase tracking-tight text-white">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm font-medium leading-6 text-white/50">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <footer className="border-t border-white/[0.06] py-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest text-white/30">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacidad</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Términos</Link>
            <Link href="/support" className="hover:text-white/60 transition-colors">Soporte</Link>
            <Link href="/landing" className="hover:text-white/60 transition-colors">Inicio</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
