'use client';

import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import type { ParsedExercise, ExerciseBrowseItem } from '@/types/workout';
import { SearchSheet } from './SearchSheet';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';
import { resolveExerciseMedia } from '@/lib/media/resolver';

interface EditSessionSheetProps {
  onClose: () => void;
  exercises: ParsedExercise[];
  onSave: (exercises: ParsedExercise[]) => void;
}

export function EditSessionSheet({ onClose, exercises: initialExercises, onSave }: EditSessionSheetProps) {
  const [exercises, setExercises] = useState<ParsedExercise[]>(initialExercises);
  const [showSearch, setShowSearch] = useState(false);

  const handleUpdateExercise = (id: string, updates: Partial<ParsedExercise>) => {
    setExercises(exercises.map(ex => (ex.id === id ? { ...ex, ...updates } : ex)));
  };

  const handleRemoveExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleAddExercise = (item: ExerciseBrowseItem) => {
    const newEx: ParsedExercise = {
      id: uuidv4(),
      originalName: item.name,
      cleanName: item.name,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: 90,
      mediaUrl: resolveExerciseMedia(item.name),
    };
    setExercises([...exercises, newEx]);
    setShowSearch(false);
  };

  if (showSearch) {
    return <SearchSheet onClose={() => setShowSearch(false)} onSelectExercise={handleAddExercise} />;
  }

  return (
    <Sheet onClose={onClose} title="Editar sesión" height="85vh">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 no-scrollbar">
          {exercises.map((ex, idx) => (
            <div key={ex.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 mb-1">
                    Ejercicio {idx + 1}
                  </p>
                  <h4 className="truncate font-display text-base font-black uppercase tracking-tight text-white/90">
                    {ex.cleanName}
                  </h4>
                </div>
                <button
                  onClick={() => handleRemoveExercise(ex.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Series</label>
                  <div className="flex items-center rounded-lg bg-white/5 p-1">
                    <button
                      onClick={() => handleUpdateExercise(ex.id, { sets: Math.max(1, ex.sets - 1) })}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-white/60 hover:text-white"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-black text-sm text-white">{ex.sets}</span>
                    <button
                      onClick={() => handleUpdateExercise(ex.id, { sets: ex.sets + 1 })}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-white/60 hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Repeticiones</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={ex.repsMin}
                      onChange={(e) => handleUpdateExercise(ex.id, { repsMin: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg bg-white/5 px-2 py-2 text-center text-sm font-black text-white outline-none"
                    />
                    <span className="text-white/30 font-black">-</span>
                    <input
                      type="number"
                      value={ex.repsMax}
                      onChange={(e) => handleUpdateExercise(ex.id, { repsMax: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg bg-white/5 px-2 py-2 text-center text-sm font-black text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowSearch(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] py-4 text-[11px] font-black uppercase tracking-widest text-white/50 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white/80"
          >
            <Plus className="h-4 w-4" />
            Añadir ejercicio
          </button>
        </div>

        <div className="shrink-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
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
            Save Changes
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
