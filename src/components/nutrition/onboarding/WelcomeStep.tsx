'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n/LanguageProvider';

interface WelcomeStepProps {
  displayName: string;
  onActivate: () => void;
  onSkipNutrition: () => void;
  onDefer: () => void;
}

export function WelcomeStep({ displayName, onActivate, onSkipNutrition, onDefer }: WelcomeStepProps) {
  const { t } = useI18n();
  const w = t.onboarding.welcome;
  const greeting = w.greeting.replace('{name}', displayName);

  return (
    <section className="flex flex-col gap-8 pt-6">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600 blur-[var(--blur-lg)] opacity-30 animate-pulse rounded-full" />
          <div className="relative w-16 h-16 rounded-[var(--radius-lg)] bg-gradient-to-tr from-white/20 to-white/5 p-px backdrop-blur-3xl">
            <div className="w-full h-full rounded-[var(--radius-md)] bg-black/40 flex items-center justify-center border border-white/10">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.3em]">{greeting}</p>
        <h1 className="text-3xl font-black text-white leading-tight">{w.title}</h1>
        <p className="text-sm text-white/60 max-w-md leading-relaxed">{w.body}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button variant="glass-primary" size="xl" onClick={onActivate} className="w-full">
          {w.ctaActivate}
        </Button>
        <Button variant="glass" onClick={onSkipNutrition} className="w-full h-12">
          {w.ctaSkip}
        </Button>
        <Button variant="ghost" onClick={onDefer} className="w-full text-white/40 hover:text-white/70">
          {w.ctaDefer}
        </Button>
      </div>
    </section>
  );
}
