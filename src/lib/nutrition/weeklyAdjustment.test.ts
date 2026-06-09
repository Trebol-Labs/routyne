import { describe, expect, it } from 'vitest';
import type { BodyweightRecord } from '@/lib/db/schema';
import { kcalFromMacros } from './calculations';
import {
  analyzeWeeklyTrend,
  applyCalorieDelta,
  weeklyAverages,
} from './weeklyAdjustment';

const makeWeight = (
  date: string,
  weight: number,
  unit: BodyweightRecord['unit'] = 'kg',
): BodyweightRecord => ({
  id: `${date}-${weight}`,
  date,
  weight,
  unit,
  updatedAt: `${date}T08:00:00.000Z`,
  deletedAt: null,
});

describe('weeklyAdjustment', () => {
  it('groups bodyweight entries by ISO week and converts pounds to kg', () => {
    const averages = weeklyAverages([
      makeWeight('2026-05-04', 200, 'lbs'),
      makeWeight('2026-05-05', 202, 'lbs'),
      makeWeight('2026-05-12', 205, 'lbs'),
    ]);

    expect(averages).toHaveLength(2);
    expect(averages[0].avgKg).toBeCloseTo(91.1725, 3);
    expect(averages[0].count).toBe(2);
  });

  it('flags a stalled bulk and suggests a calorie increase', () => {
    const analysis = analyzeWeeklyTrend({
      phase: 'volume',
      weights: [
        makeWeight('2026-05-01', 80),
        makeWeight('2026-05-10', 80.1),
        makeWeight('2026-05-19', 80.05),
      ],
      currentCalories: 2200,
    });

    expect(analysis.status).toBe('stalled');
    expect(analysis.deltaKcal).toBe(150);
    expect(analysis.suggestedCalories).toBe(2350);
    expect(analysis.weeklyAverages).toHaveLength(3);
  });

  it('reduces calories by trimming carbs first and fat second when needed', () => {
    const goal = {
      id: 'default' as const,
      calories: 2200,
      proteinGrams: 160,
      carbsGrams: 40,
      fatGrams: 20,
      updatedAt: new Date().toISOString(),
      phase: 'definition' as const,
    };

    const patch = applyCalorieDelta(goal, -150);

    expect(patch.proteinGrams).toBe(160);
    expect(patch.carbsGrams).toBeLessThanOrEqual(40);
    expect(patch.fatGrams).toBeLessThanOrEqual(20);
    expect(patch.calories).toBe(
      kcalFromMacros(patch.proteinGrams ?? 0, patch.carbsGrams ?? 0, patch.fatGrams ?? 0),
    );
  });
});
