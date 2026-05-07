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
  streakDays: 0,
  totalWorkouts: 0,
};

describe('buildSystemPrompt nutrition context', () => {
  it('includes saved nutrition targets so the coach can anchor recommendations', () => {
    const prompt = buildSystemPrompt(baseContext);

    expect(prompt).toContain('OBJETIVO NUTRICIONAL GUARDADO');
    expect(prompt).toContain('Kcal: 2100');
    expect(prompt).toContain('Proteína: 176g');
    expect(prompt).toContain('Carbohidratos: 205g');
    expect(prompt).toContain('Grasa: 64g');
    expect(prompt).toContain('usa lenguaje de estimación inicial');
    expect(prompt).toContain('prometas cambios lineales');
  });

  it('does not invent a saved target when nutrition context is missing', () => {
    const prompt = buildSystemPrompt({ ...baseContext, nutritionGoal: null });

    expect(prompt).toContain('(sin objetivo nutricional guardado)');
    expect(prompt).not.toContain('Kcal: 2100');
  });
});
