'use client';

import { useI18n } from '@/components/i18n/LanguageProvider';
import { TrendingUp, Flame, Scale } from 'lucide-react';
import { SelectCard } from './SelectCard';
import { StepFooter } from './StepFooter';
import { isGoalValid, type OnboardingDraft } from './types';
import type { ActivityLevel, NutritionExperience, NutritionGoal } from '@/types/nutrition';

interface GoalStepProps {
  draft: OnboardingDraft;
  onChange: (patch: Partial<OnboardingDraft>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function GoalStep({ draft, onChange, onBack, onNext }: GoalStepProps) {
  const { t } = useI18n();
  const g = t.onboarding.goal;

  const activities: { id: ActivityLevel; title: string; desc: string }[] = [
    { id: 'sedentary', title: g.activitySedentary, desc: g.activitySedentaryDesc },
    { id: 'light', title: g.activityLight, desc: g.activityLightDesc },
    { id: 'moderate', title: g.activityModerate, desc: g.activityModerateDesc },
    { id: 'very_active', title: g.activityVeryActive, desc: g.activityVeryActiveDesc },
    { id: 'extra_active', title: g.activityExtraActive, desc: g.activityExtraActiveDesc },
  ];

  const goals: { id: NutritionGoal; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'bulk', title: g.goalBulk, desc: g.goalBulkDesc, icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'cut', title: g.goalCut, desc: g.goalCutDesc, icon: <Flame className="w-5 h-5" /> },
    { id: 'recomp', title: g.goalRecomp, desc: g.goalRecompDesc, icon: <Scale className="w-5 h-5" /> },
  ];

  const experiences: { id: NutritionExperience; title: string; desc: string }[] = [
    { id: 'beginner', title: g.experienceBeginner, desc: g.experienceBeginnerDesc },
    { id: 'intermediate', title: g.experienceIntermediate, desc: g.experienceIntermediateDesc },
    { id: 'advanced', title: g.experienceAdvanced, desc: g.experienceAdvancedDesc },
  ];

  return (
    <section className="flex flex-col gap-6 pt-2">
      <header>
        <h1 className="text-2xl font-black text-white">{g.title}</h1>
        <p className="text-sm text-white/50 mt-1">{g.subtitle}</p>
      </header>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">{g.activityLabel}</h2>
        <div className="flex flex-col gap-2">
          {activities.map((a) => (
            <SelectCard
              key={a.id}
              selected={draft.activityLevel === a.id}
              onClick={() => onChange({ activityLevel: a.id })}
              title={a.title}
              description={a.desc}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">{g.goalLabel}</h2>
        <div className="grid grid-cols-1 gap-2">
          {goals.map((goal) => (
            <SelectCard
              key={goal.id}
              selected={draft.goal === goal.id}
              onClick={() => onChange({ goal: goal.id })}
              title={goal.title}
              description={goal.desc}
              icon={goal.icon}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">{g.experienceLabel}</h2>
        <div className="grid grid-cols-1 gap-2">
          {experiences.map((e) => (
            <SelectCard
              key={e.id}
              selected={draft.experience === e.id}
              onClick={() => onChange({ experience: e.id })}
              title={e.title}
              description={e.desc}
              compact
            />
          ))}
        </div>
      </div>

      <StepFooter
        onBack={onBack}
        onNext={onNext}
        backLabel={t.onboarding.back}
        nextLabel={t.onboarding.next}
        nextDisabled={!isGoalValid(draft)}
      />
    </section>
  );
}
