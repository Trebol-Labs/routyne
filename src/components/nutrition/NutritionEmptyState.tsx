'use client';

import { useRouter } from 'next/navigation';
import { Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n/LanguageProvider';

export function NutritionEmptyState() {
  const { t } = useI18n();
  const router = useRouter();
  const e = t.nutritionView.emptyState;

  return (
    <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-6 flex flex-col items-center text-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
        <Apple className="w-6 h-6 text-emerald-300" />
      </div>
      <div className="flex flex-col gap-1.5 max-w-sm">
        <h3 className="text-base font-black text-white">{e.title}</h3>
        <p className="text-xs text-white/50 leading-relaxed">{e.body}</p>
      </div>
      <Button variant="glass-primary" size="lg" onClick={() => router.push('/onboarding')}>
        {e.cta}
      </Button>
    </section>
  );
}
