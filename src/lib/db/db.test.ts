import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDBSingleton, deleteDatabase } from './index';
import { saveRoutine, loadRoutine, listRoutines, deleteRoutine } from './routines';
import { saveHistoryEntry, loadHistory } from './history';
import { saveActiveSession, loadActiveSession, clearActiveSession } from './activeSession';
import { loadProfile, saveProfile } from './profile';
import type { RoutineData, HistoryEntry } from '@/types/workout';

const mockRoutine: RoutineData = {
  id: 'r-test',
  title: 'Test Routine',
  createdAt: new Date('2026-01-01'),
  sessions: [
    {
      id: 's1',
      title: 'Day A',
      exercises: [
        {
          id: 'ex-1',
          originalName: 'Bench Press',
          cleanName: 'Bench Press',
          sets: 3,
          repsMin: 8,
          repsMax: 10,
          restSeconds: 90,
          mediaUrl: null,
        },
      ],
    },
  ],
};

const mockEntry: HistoryEntry = {
  id: 'h-1',
  sessionIdx: 0,
  sessionTitle: 'Day A',
  completedAt: new Date('2026-02-01T10:00:00Z'),
  completedExercises: ['ex-1'],
  volumeData: [
    {
      exerciseId: 'ex-1',
      cleanName: 'Bench Press',
      setsCompleted: 3,
      totalReps: 30,
      totalVolume: 3000,
    },
  ],
  totalVolume: 3000,
};

beforeEach(async () => {
  await deleteDatabase();  // fresh IDB for every test
});

afterEach(() => {
  resetDBSingleton();
});

// ── Routines ──────────────────────────────────────────────────────────────────

describe('routines', () => {
  it('saves and loads a routine', async () => {
    await saveRoutine(mockRoutine, '# Test');
    const loaded = await loadRoutine('r-test');
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe('Test Routine');
    expect(loaded!.sessions).toHaveLength(1);
    expect(loaded!.sessions[0].exercises).toHaveLength(1);
    expect(loaded!.sessions[0].exercises[0].cleanName).toBe('Bench Press');
  });

  it('returns null for unknown routine', async () => {
    const result = await loadRoutine('no-such-id');
    expect(result).toBeNull();
  });

  it('lists routines', async () => {
    await saveRoutine(mockRoutine, '');
    const list = await listRoutines();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('r-test');
    expect(list[0].sessionCount).toBe(1);
    expect(list[0].exerciseCount).toBe(1);
  });

  it('deletes a routine', async () => {
    await saveRoutine(mockRoutine, '');
    await deleteRoutine('r-test');
    const loaded = await loadRoutine('r-test');
    expect(loaded).toBeNull();
    const list = await listRoutines();
    expect(list).toHaveLength(0);
  });

  it('overwrites routine on re-save (idempotent)', async () => {
    await saveRoutine(mockRoutine, 'v1');
    await saveRoutine({ ...mockRoutine, title: 'Updated' }, 'v2');
    const list = await listRoutines();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe('Updated');
  });

  it('preserves createdAt as a Date', async () => {
    await saveRoutine(mockRoutine, '');
    const loaded = await loadRoutine('r-test');
    expect(loaded!.createdAt).toBeInstanceOf(Date);
  });
});

// ── History ───────────────────────────────────────────────────────────────────

describe('history', () => {
  it('saves and loads a history entry', async () => {
    await saveHistoryEntry(mockEntry, 'r-test', 's1');
    const { entries } = await loadHistory(50);
    expect(entries).toHaveLength(1);
    expect(entries[0].totalVolume).toBe(3000);
    expect(entries[0].completedAt).toBeInstanceOf(Date);
  });

  it('loads history newest-first', async () => {
    const older: HistoryEntry = { ...mockEntry, id: 'h-2', completedAt: new Date('2026-01-01') };
    const newer: HistoryEntry = { ...mockEntry, id: 'h-3', completedAt: new Date('2026-03-01') };
    await saveHistoryEntry(older, 'r-test', 's1');
    await saveHistoryEntry(newer, 'r-test', 's1');
    const { entries } = await loadHistory(50);
    expect(entries[0].id).toBe('h-3');
    expect(entries[1].id).toBe('h-2');
  });

  it('paginates with limit', async () => {
    for (let i = 0; i < 5; i++) {
      await saveHistoryEntry(
        { ...mockEntry, id: `h-${i}`, completedAt: new Date(`2026-0${i + 1}-01`) },
        'r-test', 's1'
      );
    }
    const { entries, hasMore } = await loadHistory(3);
    expect(entries).toHaveLength(3);
    expect(hasMore).toBe(true);
  });
});

// ── ActiveSession ─────────────────────────────────────────────────────────────

describe('activeSession', () => {
  it('saves and loads active session', async () => {
    await saveActiveSession('r-test', 's1', 0, {
      '0-ex-1-0': { completed: true, repsDone: 10, weight: 60 },
    });
    const record = await loadActiveSession();
    expect(record).not.toBeNull();
    expect(record!.routineId).toBe('r-test');
    expect(record!.setCompletion['0-ex-1-0'].completed).toBe(true);
    expect(record!.setCompletion['0-ex-1-0'].weight).toBe(60);
  });

  it('clears active session', async () => {
    await saveActiveSession('r-test', 's1', 0, {});
    await clearActiveSession();
    const record = await loadActiveSession();
    expect(record).toBeNull();
  });

  it('returns null when no active session', async () => {
    const record = await loadActiveSession();
    expect(record).toBeNull();
  });
});

// ── Profile ───────────────────────────────────────────────────────────────────

describe('profile', () => {
  it('returns default profile when none saved', async () => {
    const p = await loadProfile();
    expect(p.displayName).toBe('Athlete');
    expect(p.weightUnit).toBe('kg');
  });

  it('saves and loads profile', async () => {
    await saveProfile({
      displayName: 'Sierra',
      avatarEmoji: '🏋️',
      weightUnit: 'lbs',
      heightCm: 165,
      defaultRestSeconds: 120,
      restDays: [],
    });
    const p = await loadProfile();
    expect(p.displayName).toBe('Sierra');
    expect(p.weightUnit).toBe('lbs');
    expect(p.defaultRestSeconds).toBe(120);
  });
});
