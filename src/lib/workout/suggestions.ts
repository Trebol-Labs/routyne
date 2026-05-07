import type { HistoryEntry, WorkoutState } from '@/types/workout';

export interface AutoSuggestion {
  repsDone: number;
  weight?: number;
}

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

function toPositiveNumber(value: number | null | undefined): number | undefined {
  if (value == null || Number.isNaN(value) || value <= 0) {
    return undefined;
  }

  return value;
}

export function getSameSessionPreviousSetSuggestion(
  setCompletion: WorkoutState['setCompletion'],
  sessionIdx: number,
  exerciseId: string,
  setIdx: number
): AutoSuggestion | null {
  for (let i = setIdx - 1; i >= 0; i -= 1) {
    const status = setCompletion[`${sessionIdx}-${exerciseId}-${i}`];
    if (status?.completed && (status.repsDone ?? 0) > 0) {
      return {
        repsDone: status.repsDone ?? 0,
        weight: toPositiveNumber(status.weight),
      };
    }
  }

  return null;
}

export function getHistorySetSuggestion(
  history: HistoryEntry[],
  exerciseId: string,
  exerciseName: string,
  setIdx: number
): AutoSuggestion | null {
  const normalizedExerciseName = normalizeExerciseName(exerciseName);

  for (const entry of history) {
    const matchingExercise =
      entry.volumeData.find((ev) => ev.exerciseId === exerciseId) ??
      entry.volumeData.find((ev) => normalizeExerciseName(ev.cleanName) === normalizedExerciseName);

    if (!matchingExercise?.setDetails?.length) {
      continue;
    }

    const matchingSet = matchingExercise.setDetails.find(
      (setDetail) => setDetail.setIdx === setIdx && setDetail.repsDone > 0
    );

    if (!matchingSet) {
      continue;
    }

    return {
      repsDone: matchingSet.repsDone,
      weight: toPositiveNumber(matchingSet.weight),
    };
  }

  return null;
}

export function getAutoSetSuggestion(params: {
  setCompletion: WorkoutState['setCompletion'];
  history: HistoryEntry[];
  sessionIdx: number;
  exerciseId: string;
  exerciseName: string;
  setIdx: number;
}): AutoSuggestion | null {
  const historySuggestion = getHistorySetSuggestion(
    params.history,
    params.exerciseId,
    params.exerciseName,
    params.setIdx
  );

  if (historySuggestion) {
    return historySuggestion;
  }

  return getSameSessionPreviousSetSuggestion(
    params.setCompletion,
    params.sessionIdx,
    params.exerciseId,
    params.setIdx
  );
}

