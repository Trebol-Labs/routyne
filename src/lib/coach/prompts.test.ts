import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from './prompts';
import type { UserCoachContext } from './context-builder';

const baseContext: UserCoachContext = {
  profile: {
    displayName: 'Nico',
    weightUnit: 'kg',
    trainingGoal: 'hypertrophy',
    experienceLevel: 'beginner',
    coachTone: 'direct',
    effortTracking: 'both',
    language: 'es',
    timezone: 'America/Bogota',
  },
  recentSessions: [],
  personalRecords: [],
  weeklyMuscleVolume: [],
  nutritionGoal: {
    calories: 2100,
    proteinGrams: 176,
    carbsGrams: 205,
    fatGrams: 64,
    updatedAt: '2026-05-07T15:00:00.000Z',
  },
  nutritionProfile: null,
  pendingAdjustment: null,
  bodyweightTrend: { latestKg: null, latestDate: null, weeklyChangePct: null, pointsLast30Days: 0 },
  fitnessProfile: null,
  stallSignals: [],
  weeklyTrainingDays: 0,
  streakDays: 0,
  totalWorkouts: 0,
  hevyArchive: null,
};

describe('buildSystemPrompt nutrition context', () => {
  it('includes saved nutrition targets so the coach can anchor recommendations', () => {
    const prompt = buildSystemPrompt(baseContext);

    expect(prompt).toContain('OBJETIVO NUTRICIONAL GUARDADO');
    expect(prompt).toContain('Kcal: 2100');
    expect(prompt).toContain('Proteína: 176g');
    expect(prompt).toContain('Carbohidratos: 205g');
    expect(prompt).toContain('Grasa: 64g');
  });

  it('does not invent a saved target when nutrition context is missing', () => {
    const prompt = buildSystemPrompt({ ...baseContext, nutritionGoal: null });

    expect(prompt).toContain('(sin objetivo nutricional guardado)');
    expect(prompt).not.toContain('Kcal: 2100');
  });
});

describe('buildSystemPrompt coaching principles', () => {
  it('encodes the priority hierarchy so the coach uses it for diagnosis', () => {
    const prompt = buildSystemPrompt(baseContext);

    expect(prompt).toContain('JERARQUÍA DE PRIORIDADES');
    expect(prompt).toContain('Adherencia');
    expect(prompt).toContain('Sobrecarga progresiva');
    expect(prompt).toContain('Proteína total diaria');
  });

  it('includes lengthened-position tension principle and natural cut limits', () => {
    const prompt = buildSystemPrompt(baseContext);

    expect(prompt).toContain('Tensión en posición elongada');
    expect(prompt).toContain('1%/sem');
  });
});

describe('buildSystemPrompt rich nutrition profile', () => {
  it('formats the rich profile and protein per kg', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      nutritionProfile: {
        goal: 'cut',
        experience: 'intermediate',
        weightKg: 80,
        heightCm: 178,
        ageYears: 30,
        sex: 'male',
        activityLevel: 'moderate',
        bodyFatPct: 15,
        trainingDaysPerWeek: 4,
        trainingType: 'hypertrophy',
        bmrKcal: 1800,
        tdeeKcal: 2700,
        targetKcal: 2300,
        proteinG: 192,
        carbsG: 220,
        fatsG: 70,
        proteinPerKg: 2.4,
        dietaryRestrictions: [],
      },
    });

    expect(prompt).toContain('Fase: cut');
    expect(prompt).toContain('TDEE: 2700');
    expect(prompt).toContain('2.4 g/kg');
  });

  it('asks for missing data when no rich profile present', () => {
    const prompt = buildSystemPrompt(baseContext);
    expect(prompt).toContain('sin perfil de nutrición onboarded');
  });
});

describe('buildSystemPrompt pending adjustment + stall signals', () => {
  it('surfaces the pending adjustment for adaptive coaching', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      pendingAdjustment: {
        reason: 'too_slow',
        weeklyWeightChangePct: -0.1,
        previousTargetKcal: 2300,
        suggestedTargetKcal: 2150,
        deltaKcal: -150,
        computedAt: '2026-05-08T00:00:00.000Z',
      },
    });

    expect(prompt).toContain('AJUSTE ADAPTATIVO PENDIENTE');
    expect(prompt).toContain('demasiado lento');
    expect(prompt).toContain('2300 → 2150');
  });

  it('lists stall signals to drive priority-hierarchy diagnosis', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      stallSignals: [
        { exerciseName: 'bench press', sessionsTracked: 4, flatOrRegressing: true },
      ],
    });

    expect(prompt).toContain('ESTANCAMIENTOS DETECTADOS');
    expect(prompt).toContain('bench press');
  });
});

describe('buildSystemPrompt Hevy archive context', () => {
  it('formats the imported Hevy archive when present', () => {
    const prompt = buildSystemPrompt({
      ...baseContext,
      hevyArchive: {
        importedAt: '2026-05-08T00:00:00.000Z',
        totalWorkouts: 2,
        firstWorkoutAt: '2025-01-01T10:00:00Z',
        lastWorkoutAt: '2025-02-01T10:00:00Z',
        spanDays: 31,
        avgWorkoutsPerWeek: 0.5,
        totalSets: 10,
        totalVolumeKg: 1234.5,
        avgDurationMinutes: 75,
        setTypeMix: { warmup: 2, working: 8, dropset: 0, failure: 0 },
        rpeUsageRatio: 0.8,
        topExercises: [
          {
            name: 'Bench Press',
            workouts: 2,
            totalSets: 5,
            totalReps: 40,
            totalVolumeKg: 320,
            bestWeightKg: 90,
            bestReps: 5,
            bestEst1RMKg: 105,
            bestEst1RMDate: '2025-02-01',
            firstSeen: '2025-01-01',
            lastSeen: '2025-02-01',
            avgRpe: 8,
          },
        ],
        progression: [],
        stagnation: [],
        comments: { workoutNotes: [], exerciseNotes: [] },
        recentWorkouts: [],
      },
    });

    expect(prompt).toContain('ARCHIVO HISTÓRICO DE HEVY');
    expect(prompt).toContain('Bench Press');
    expect(prompt).toContain('Histórico cargado: 2 entrenamientos');
  });
});
