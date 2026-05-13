'use client';

import { useState } from 'react';
import { Search, Trash2, CheckCircle2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import type { ParsedExercise, ExerciseBrowseItem } from '@/types/workout';
import { SearchSheet } from './SearchSheet';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { resolveExerciseMedia } from '@/lib/media/resolver';
import { useI18n } from '@/components/i18n/LanguageProvider';

interface EditSessionSheetProps {
  onClose: () => void;
  onSave: (exercises: ParsedExercise[]) => void;
  exercises: ParsedExercise[];
  sessionTitle?: string;
}

type SearchContext =
  | {
      intent: 'add';
    }
  | {
      intent: 'replace';
      targetExerciseId: string;
      initialQuery: string;
    }
  | null;

function makeExerciseFromBrowseItem(item: ExerciseBrowseItem): ParsedExercise {
  return {
    id: uuidv4(),
    originalName: item.name,
    cleanName: item.name,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    restSeconds: 90,
    mediaUrl: resolveExerciseMedia(item.name),
  };
}

export function EditSessionSheet({
  onClose,
  onSave,
  exercises: initialExercises,
  sessionTitle,
}: EditSessionSheetProps) {
  const [exercises, setExercises] = useState<ParsedExercise[]>(initialExercises);
  const [searchContext, setSearchContext] = useState<SearchContext>(null);
  const { t } = useI18n();

  const handleUpdateExercise = (id: string, updates: Partial<ParsedExercise>) => {
    setExercises((current) => current.map((exercise) => (exercise.id === id ? { ...exercise, ...updates } : exercise)));
  };

  const handleRemoveExercise = (id: string) => {
    setExercises((current) => current.filter((exercise) => exercise.id !== id));
  };

  const handleCommitExercise = (item: ExerciseBrowseItem) => {
    setExercises((current) => {
      if (searchContext?.intent === 'replace') {
        return current.map((exercise) =>
          exercise.id === searchContext.targetExerciseId
            ? {
                ...exercise,
                originalName: item.name,
                cleanName: item.name,
                mediaUrl: resolveExerciseMedia(item.name),
              }
            : exercise
        );
      }

      return [...current, makeExerciseFromBrowseItem(item)];
    });

    setSearchContext(null);
  };

  if (searchContext) {
    const targetLabel = searchContext.intent === 'replace'
      ? exercises.find((exercise) => exercise.id === searchContext.targetExerciseId)?.cleanName ?? null
      : sessionTitle ?? t.editSession.title;

    return (
      <SearchSheet
        intent={searchContext.intent}
        targetLabel={targetLabel}
        initialQuery={searchContext.intent === 'replace'
          ? exercises.find((exercise) => exercise.id === searchContext.targetExerciseId)?.cleanName ?? ''
          : ''}
        autoFocusInput
        onClose={() => setSearchContext(null)}
        onCommit={handleCommitExercise}
      />
    );
  }

  return (
    <Sheet onClose={onClose} title={t.editSession.title} height="85vh">
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 no-scrollbar">
          {exercises.map((ex, idx) => (
            <div key={ex.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                    {t.editSession.exercise} {idx + 1}
                  </p>
                  <h4 className="truncate font-display text-base font-black uppercase tracking-tight text-white/90">
                    {ex.cleanName}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchContext({ intent: 'replace', targetExerciseId: ex.id, initialQuery: ex.cleanName })}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label={t.editSession.replaceExercise}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(ex.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                    aria-label={t.editSession.removeExercise}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                    {t.editSession.sets}
                  </label>
                  <div className="flex items-center rounded-lg bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(ex.id, { sets: Math.max(1, ex.sets - 1) })}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-white/60 hover:text-white"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-black text-sm text-white">{ex.sets}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateExercise(ex.id, { sets: ex.sets + 1 })}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-white/60 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                    {t.editSession.reps}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={ex.repsMin}
                      onChange={(event) => handleUpdateExercise(ex.id, { repsMin: parseInt(event.target.value, 10) || 0 })}
                      className="w-full rounded-lg bg-white/5 px-2 py-2 text-center text-sm font-black text-white outline-none"
                    />
                    <span className="font-black text-white/30">-</span>
                    <input
                      type="number"
                      value={ex.repsMax}
                      onChange={(event) => handleUpdateExercise(ex.id, { repsMax: parseInt(event.target.value, 10) || 0 })}
                      className="w-full rounded-lg bg-white/5 px-2 py-2 text-center text-sm font-black text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setSearchContext({ intent: 'add' })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-4 text-[11px] font-black uppercase tracking-widest text-white/50 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white/80"
          >
            <Search className="h-4 w-4" />
            {t.editSession.addExercise}
          </button>
        </div>

        <div className="shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4">
          <Button
            variant="glass-primary"
            size="lg"
            className="w-full gap-2 rounded-xl font-black uppercase tracking-widest"
            onClick={() => {
              onSave(exercises);
              onClose();
            }}
          >
            <CheckCircle2 className="h-5 w-5" />
            {t.editSession.saveChanges}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
