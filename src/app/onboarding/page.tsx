'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useHydration } from '@/hooks/useHydration';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { NUTRITION_ENABLED } from '@/lib/feature-flags';
import {
  loadNutritionProfile,
  saveNutritionProfile,
  markOnboardingCompleted,
  markOnboardingDeferred,
  markNutritionDisabled,
} from '@/lib/db/nutritionProfile';
import { computeAll } from '@/lib/nutrition/calculations';
import type { NutritionProfile } from '@/types/nutrition';

import { OnboardingShell } from '@/components/nutrition/onboarding/OnboardingShell';
import { WelcomeStep } from '@/components/nutrition/onboarding/WelcomeStep';
import { BasicsStep } from '@/components/nutrition/onboarding/BasicsStep';
import { GoalStep } from '@/components/nutrition/onboarding/GoalStep';
import { OptionalStep } from '@/components/nutrition/onboarding/OptionalStep';
import { SummaryStep } from '@/components/nutrition/onboarding/SummaryStep';
import { EMPTY_DRAFT, type OnboardingDraft } from '@/components/nutrition/onboarding/types';

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const auth = useAuth();
  const isHydrated = useHydration();
  const profile = useWorkoutStore((s) => s.profile);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);

  // If feature flag off or user not signed in, leave page.
  useEffect(() => {
    if (!NUTRITION_ENABLED) router.replace('/');
  }, [router]);

  // Pre-fill weight from profile data if available (no-op for now since we
  // only store unit preference, not actual bodyweight in profile).
  useEffect(() => {
    if (!isHydrated) return;
    void (async () => {
      const existing = await loadNutritionProfile();
      if (existing) {
        setDraft({
          sex: existing.sex,
          ageYears: existing.ageYears,
          heightCm: existing.heightCm,
          weightKg: existing.weightKg,
          activityLevel: existing.activityLevel,
          goal: existing.goal,
          experience: existing.experience,
          bodyFatPct: existing.bodyFatPct,
          trainingDaysPerWeek: existing.trainingDaysPerWeek,
          trainingType: existing.trainingType,
          trainingTime: existing.trainingTime,
          dietaryRestrictions: existing.dietaryRestrictions,
          customRestrictions: existing.customRestrictions,
          budget: existing.budget,
        });
      }
    })();
  }, [isHydrated]);

  const displayName = useMemo(() => {
    const meta = auth.user?.user_metadata as Record<string, unknown> | undefined;
    const fromMeta = typeof meta?.name === 'string' ? (meta.name as string).split(' ')[0] : null;
    return fromMeta || profile.displayName || 'Atleta';
  }, [auth.user, profile.displayName]);

  const computed = useMemo(() => {
    if (
      draft.sex === null ||
      draft.ageYears === null ||
      draft.heightCm === null ||
      draft.weightKg === null ||
      draft.activityLevel === null ||
      draft.goal === null ||
      draft.experience === null
    ) {
      return null;
    }
    return computeAll({
      weightKg: draft.weightKg,
      heightCm: draft.heightCm,
      ageYears: draft.ageYears,
      sex: draft.sex,
      bodyFatPct: draft.bodyFatPct,
      activityLevel: draft.activityLevel,
      goal: draft.goal,
      experience: draft.experience,
      trainingTime: draft.trainingTime,
    });
  }, [draft]);

  const updateDraft = (patch: Partial<OnboardingDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const handleSkipNutrition = async () => {
    try {
      await markNutritionDisabled();
      await markOnboardingCompleted();
    } finally {
      router.replace('/');
    }
  };

  const handleDefer = async () => {
    try {
      await markOnboardingDeferred();
    } finally {
      router.replace('/');
    }
  };

  const handleFinish = async () => {
    if (!computed) return;
    if (
      draft.sex === null ||
      draft.ageYears === null ||
      draft.heightCm === null ||
      draft.weightKg === null ||
      draft.activityLevel === null ||
      draft.goal === null ||
      draft.experience === null
    ) {
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const profileToSave: NutritionProfile = {
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        ageYears: draft.ageYears,
        sex: draft.sex,
        activityLevel: draft.activityLevel,
        goal: draft.goal,
        experience: draft.experience,
        bodyFatPct: draft.bodyFatPct,
        trainingDaysPerWeek: draft.trainingDaysPerWeek,
        trainingType: draft.trainingType,
        trainingTime: draft.trainingTime,
        dietaryRestrictions: draft.dietaryRestrictions,
        customRestrictions: draft.customRestrictions,
        budget: draft.budget,
        bmrKcal: computed.bmrKcal,
        tdeeKcal: computed.tdeeKcal,
        targetKcal: computed.targetKcal,
        proteinG: computed.macros.proteinG,
        fatsG: computed.macros.fatsG,
        carbsG: computed.macros.carbsG,
        createdAt: now,
        updatedAt: now,
      };
      await saveNutritionProfile(profileToSave);
      await markOnboardingCompleted();
      router.replace('/');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state while we hydrate / wait for auth.
  if (!isHydrated || auth.isLoading) {
    return (
      <main className="min-h-[100dvh] liquid-bg-dark flex items-center justify-center" />
    );
  }

  return (
    <OnboardingShell step={step} totalSteps={TOTAL_STEPS} stepKey={`step-${step}`}>
      {step === 0 && (
        <WelcomeStep
          displayName={displayName}
          onActivate={() => setStep(1)}
          onSkipNutrition={handleSkipNutrition}
          onDefer={handleDefer}
        />
      )}
      {step === 1 && (
        <BasicsStep
          draft={draft}
          weightUnit={profile.weightUnit}
          onChange={updateDraft}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <GoalStep
          draft={draft}
          onChange={updateDraft}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <OptionalStep
          draft={draft}
          onChange={updateDraft}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
          onSkip={() => setStep(4)}
        />
      )}
      {step === 4 && computed && (
        <SummaryStep
          result={computed}
          onBack={() => setStep(3)}
          onFinish={handleFinish}
          isSaving={isSaving}
        />
      )}
    </OnboardingShell>
  );
}
