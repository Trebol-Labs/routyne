import { describe, it, expect } from 'vitest';
import { computeHevyDigest } from './digest';
import type { HevyWorkout, HevySet, HevyExercise } from './types';

function set(partial: Partial<HevySet> & { index: number }): HevySet {
  return {
    type: 'normal',
    weight_kg: null,
    reps: null,
    distance_meters: null,
    duration_seconds: null,
    rpe: null,
    custom_metric: null,
    ...partial,
  };
}

function exercise(title: string, sets: HevySet[], notes: string | null = null, index = 0): HevyExercise {
  return {
    index,
    title,
    notes,
    exercise_template_id: `tpl-${title}`,
    superset_id: null,
    sets,
  };
}

function workout(opts: {
  id: string;
  start: string;
  end?: string;
  title?: string;
  description?: string | null;
  exercises: HevyExercise[];
}): HevyWorkout {
  return {
    id: opts.id,
    title: opts.title ?? 'Session',
    description: opts.description ?? null,
    start_time: opts.start,
    end_time: opts.end ?? opts.start,
    updated_at: opts.start,
    created_at: opts.start,
    exercises: opts.exercises,
  };
}

describe('computeHevyDigest', () => {
  it('returns zero-state for empty input', () => {
    const d = computeHevyDigest([]);
    expect(d.totalWorkouts).toBe(0);
    expect(d.topExercises).toEqual([]);
    expect(d.firstWorkoutAt).toBeNull();
  });

  it('aggregates totals, frequency and PR dates from working sets only', () => {
    const w1 = workout({
      id: 'w1',
      start: '2025-01-01T10:00:00Z',
      end: '2025-01-01T11:00:00Z',
      exercises: [
        exercise('Bench Press', [
          set({ index: 0, type: 'warmup', weight_kg: 40, reps: 10 }),
          set({ index: 1, weight_kg: 80, reps: 8, rpe: 7 }),
          set({ index: 2, weight_kg: 80, reps: 8, rpe: 8 }),
        ]),
      ],
    });
    const w2 = workout({
      id: 'w2',
      start: '2025-02-15T10:00:00Z',
      end: '2025-02-15T11:00:00Z',
      exercises: [
        exercise('Bench Press', [
          set({ index: 0, weight_kg: 90, reps: 5, rpe: 9 }),
        ]),
        exercise('Squat', [
          set({ index: 0, weight_kg: 100, reps: 5 }),
        ]),
      ],
    });

    const d = computeHevyDigest([w1, w2], new Date('2025-03-01T00:00:00Z'));

    expect(d.totalWorkouts).toBe(2);
    expect(d.totalSets).toBe(4);  // 3 working bench + 1 squat (warmup excluded)
    expect(d.firstWorkoutAt).toBe('2025-01-01T10:00:00Z');
    expect(d.lastWorkoutAt).toBe('2025-02-15T10:00:00Z');

    const bench = d.topExercises.find((e) => e.name === 'Bench Press')!;
    expect(bench.workouts).toBe(2);
    expect(bench.totalSets).toBe(3);
    expect(bench.bestWeightKg).toBe(90); // PR is single at 90×5
    expect(bench.bestReps).toBe(5);
    expect(bench.bestEst1RMDate).toBe('2025-02-15');
    expect(bench.avgRpe).toBeCloseTo(8, 0);
  });

  it('builds monthly progression points', () => {
    const w1 = workout({
      id: 'w1',
      start: '2025-01-10T10:00:00Z',
      end: '2025-01-10T11:00:00Z',
      exercises: [exercise('Deadlift', [set({ index: 0, weight_kg: 140, reps: 5 })])],
    });
    const w2 = workout({
      id: 'w2',
      start: '2025-02-10T10:00:00Z',
      end: '2025-02-10T11:00:00Z',
      exercises: [exercise('Deadlift', [set({ index: 0, weight_kg: 150, reps: 5 })])],
    });
    const d = computeHevyDigest([w1, w2], new Date('2025-03-01T00:00:00Z'));
    const dl = d.progression.find((p) => p.name === 'Deadlift')!;
    expect(dl.points).toHaveLength(2);
    expect(dl.points[0].month).toBe('2025-01');
    expect(dl.points[1].month).toBe('2025-02');
    expect(dl.points[1].est1RMKg).toBeGreaterThan(dl.points[0].est1RMKg);
  });

  it('flags stagnation when no PR for ≥8 weeks', () => {
    const old = workout({
      id: 'w-old',
      start: '2025-01-01T10:00:00Z',
      end: '2025-01-01T11:00:00Z',
      exercises: [exercise('OHP', [set({ index: 0, weight_kg: 60, reps: 5 })])],
    });
    const recent = workout({
      id: 'w-recent',
      start: '2025-04-01T10:00:00Z',
      end: '2025-04-01T11:00:00Z',
      exercises: [exercise('OHP', [set({ index: 0, weight_kg: 55, reps: 5 })])],
    });
    const d = computeHevyDigest([old, recent], new Date('2025-04-15T00:00:00Z'));
    const ohpStall = d.stagnation.find((s) => s.name === 'OHP');
    expect(ohpStall).toBeDefined();
    expect(ohpStall!.weeksSincePR).toBeGreaterThanOrEqual(8);
  });

  it('collects workout descriptions and exercise notes as comments', () => {
    const w = workout({
      id: 'w1',
      start: '2025-01-01T10:00:00Z',
      end: '2025-01-01T11:00:00Z',
      description: 'felt strong, low back tight',
      exercises: [
        exercise(
          'Bench Press',
          [set({ index: 0, weight_kg: 80, reps: 8 })],
          'pause reps, shoulder twinge late sets'
        ),
      ],
    });
    const d = computeHevyDigest([w]);
    expect(d.comments.workoutNotes[0].text).toBe('felt strong, low back tight');
    expect(d.comments.exerciseNotes[0].text).toBe('pause reps, shoulder twinge late sets');
  });

  it('classifies set types with mutually exclusive counts', () => {
    const w = workout({
      id: 'w1',
      start: '2025-01-01T10:00:00Z',
      end: '2025-01-01T11:00:00Z',
      exercises: [
        exercise('Bench', [
          set({ index: 0, type: 'warmup', weight_kg: 40, reps: 10 }),
          set({ index: 1, type: 'normal', weight_kg: 80, reps: 8 }),
          set({ index: 2, type: 'dropset', weight_kg: 60, reps: 8 }),
          set({ index: 3, type: 'failure', weight_kg: 80, reps: 4 }),
        ]),
      ],
    });
    const d = computeHevyDigest([w]);
    expect(d.setTypeMix).toEqual({ warmup: 1, working: 1, dropset: 1, failure: 1 });
  });

  it('takes the 5 most recent workouts in recentWorkouts', () => {
    const ws: HevyWorkout[] = [];
    for (let i = 0; i < 8; i++) {
      ws.push(
        workout({
          id: `w${i}`,
          start: `2025-0${i + 1}-01T10:00:00Z`.replace('010', '10'),
          end: `2025-0${i + 1}-01T11:00:00Z`.replace('011', '11'),
          title: `Day ${i}`,
          exercises: [exercise('Bench', [set({ index: 0, weight_kg: 80, reps: 5 })])],
        })
      );
    }
    const d = computeHevyDigest(ws);
    expect(d.recentWorkouts).toHaveLength(5);
    expect(d.recentWorkouts[0].title).toBe('Day 7'); // newest first
  });
});
