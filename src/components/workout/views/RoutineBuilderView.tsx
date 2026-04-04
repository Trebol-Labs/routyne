'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Minus,
  Trash2,
  X,
  PlusCircle,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { generateMarkdown } from '@/lib/markdown/generator';
import type { RoutineData, ExerciseBrowseItem } from '@/types/workout';
import { SearchSheet } from '@/components/workout/overlays/SearchSheet';

// ── Local draft types ─────────────────────────────────────────────────────────

interface DraftExercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
}

interface DraftSession {
  id: string;
  title: string;
  exercises: DraftExercise[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REST_OPTIONS = [30, 45, 60, 90, 120, 180] as const;

function makeExercise(): DraftExercise {
  return {
    id: uuidv4(),
    name: '',
    sets: 3,
    repsMin: 8,
    repsMax: 10,
    restSeconds: 90,
  };
}

function makeSession(n: number): DraftSession {
  return {
    id: uuidv4(),
    title: `Day ${n}`,
    exercises: [makeExercise()],
  };
}

// ── Sortable exercise row ─────────────────────────────────────────────────────

interface ExerciseRowProps {
  exercise: DraftExercise;
  showError: boolean;
  onChange: (id: string, patch: Partial<DraftExercise>) => void;
  onDelete: (id: string) => void;
  onSearchExercise: (id: string) => void;
}

function ExerciseRow({ exercise, showError, onChange, onDelete, onSearchExercise }: ExerciseRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const clampSets = (v: number) => Math.max(1, Math.min(10, v));

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className="sunken-glass rounded-xl p-3 flex flex-col gap-2"
    >
      {/* Row 1: drag handle + name + delete */}
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="touch-none text-white/30 hover:text-white/60 transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
          type="button"
        >
          <GripVertical size={18} />
        </button>

        <div className="flex-1 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={exercise.name}
              placeholder="Exercise name"
              onChange={(e) => onChange(exercise.id, { name: e.target.value })}
              className={[
                'flex-1 bg-transparent border-b pb-0.5 text-sm text-white placeholder-white/40',
                'focus:outline-none focus:border-blue-400 transition-colors',
                showError && exercise.name.trim() === ''
                  ? 'border-red-500'
                  : 'border-white/20',
              ].join(' ')}
            />
            <button
              type="button"
              onClick={() => onSearchExercise(exercise.id)}
              className="text-white/30 hover:text-blue-400 transition-colors flex-shrink-0 pb-0.5"
              aria-label="Search exercise library"
            >
              <Search size={14} />
            </button>
          </div>
          {showError && exercise.name.trim() === '' && (
            <span className="text-[11px] text-red-400 leading-tight">
              Exercise name required
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(exercise.id)}
          className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
          aria-label="Remove exercise"
        >
          <X size={16} />
        </button>
      </div>

      {/* Row 2: sets stepper + reps + rest */}
      <div className="flex items-center gap-3 flex-wrap pl-6">
        {/* Sets */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/50 uppercase tracking-wide w-7">Sets</span>
          <button
            type="button"
            onClick={() => onChange(exercise.id, { sets: clampSets(exercise.sets - 1) })}
            className="w-6 h-6 rounded-md glass-panel flex items-center justify-center text-white/70 hover:text-white transition-colors"
            aria-label="Decrease sets"
          >
            <Minus size={12} />
          </button>
          <span className="w-5 text-center text-sm font-semibold tabular-nums">
            {exercise.sets}
          </span>
          <button
            type="button"
            onClick={() => onChange(exercise.id, { sets: clampSets(exercise.sets + 1) })}
            className="w-6 h-6 rounded-md glass-panel flex items-center justify-center text-white/70 hover:text-white transition-colors"
            aria-label="Increase sets"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Reps */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/50 uppercase tracking-wide w-7">Reps</span>
          <input
            type="number"
            min={1}
            max={100}
            value={exercise.repsMin}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
              onChange(exercise.id, {
                repsMin: v,
                repsMax: Math.max(v, exercise.repsMax),
              });
            }}
            className="w-10 bg-transparent border border-white/20 rounded-md px-1.5 py-0.5 text-center text-sm text-white focus:outline-none focus:border-blue-400"
            aria-label="Minimum reps"
          />
          <span className="text-white/40 text-xs">–</span>
          <input
            type="number"
            min={1}
            max={100}
            value={exercise.repsMax}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
              onChange(exercise.id, {
                repsMax: v,
                repsMin: Math.min(exercise.repsMin, v),
              });
            }}
            className="w-10 bg-transparent border border-white/20 rounded-md px-1.5 py-0.5 text-center text-sm text-white focus:outline-none focus:border-blue-400"
            aria-label="Maximum reps"
          />
        </div>
      </div>

      {/* Row 3: rest pills */}
      <div className="flex items-center gap-2 pl-6 flex-wrap">
        <span className="text-[11px] text-white/50 uppercase tracking-wide">Rest</span>
        {REST_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(exercise.id, { restSeconds: s })}
            className={[
              'px-2 py-0.5 rounded-full text-[11px] font-medium transition-all',
              exercise.restSeconds === s
                ? 'active-glass-btn text-white'
                : 'glass-panel text-white/50 hover:text-white',
            ].join(' ')}
          >
            {s}s
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: DraftSession;
  canDelete: boolean;
  showErrors: boolean;
  onTitleChange: (id: string, title: string) => void;
  onExerciseChange: (sessionId: string, exerciseId: string, patch: Partial<DraftExercise>) => void;
  onExerciseDelete: (sessionId: string, exerciseId: string) => void;
  onAddExercise: (sessionId: string) => void;
  onDeleteSession: (id: string) => void;
  onDragEnd: (sessionId: string, event: DragEndEvent) => void;
  onSearchExercise: (sessionId: string, exerciseId: string) => void;
}

function SessionCard({
  session,
  canDelete,
  showErrors,
  onTitleChange,
  onExerciseChange,
  onExerciseDelete,
  onAddExercise,
  onDeleteSession,
  onDragEnd,
  onSearchExercise,
}: SessionCardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="glass-panel rounded-2xl p-4 flex flex-col gap-3"
    >
      {/* Session header */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={session.title}
          placeholder="Session title"
          onChange={(e) => onTitleChange(session.id, e.target.value)}
          className="flex-1 bg-transparent border-b border-white/20 pb-0.5 text-base font-display font-semibold text-white placeholder-white/30 focus:outline-none focus:border-blue-400 transition-colors"
        />
        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteSession(session.id)}
            className="text-white/30 hover:text-red-400 transition-colors"
            aria-label="Remove session"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Exercise list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => onDragEnd(session.id, event)}
      >
        <SortableContext
          items={session.exercises.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {session.exercises.map((ex) => (
                <ExerciseRow
                  key={ex.id}
                  exercise={ex}
                  showError={showErrors}
                  onChange={(exId, patch) => onExerciseChange(session.id, exId, patch)}
                  onDelete={(exId) => onExerciseDelete(session.id, exId)}
                  onSearchExercise={(exId) => onSearchExercise(session.id, exId)}
                />
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </DndContext>

      {/* Add exercise */}
      <button
        type="button"
        onClick={() => onAddExercise(session.id)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors self-start mt-1"
      >
        <PlusCircle size={15} />
        Add Exercise
      </button>
    </motion.div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function RoutineBuilderView() {
  const setCurrentView = useWorkoutStore((s) => s.setCurrentView);
  const importRoutine = useWorkoutStore((s) => s.importRoutine);

  const [title, setTitle] = useState('My Routine');
  const [sessions, setSessions] = useState<DraftSession[]>([makeSession(1)]);
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTarget, setSearchTarget] = useState<{ sessionId: string; exerciseId: string } | null>(null);

  // ── Validation ──────────────────────────────────────────────────────────────

  const hasEmptyName = sessions.some((s) =>
    s.exercises.some((e) => e.name.trim() === '')
  );
  const canSave = title.trim() !== '' && !hasEmptyName;

  // ── Session mutations ───────────────────────────────────────────────────────

  const handleAddSession = useCallback(() => {
    setSessions((prev) => [...prev, makeSession(prev.length + 1)]);
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  const handleSessionTitleChange = useCallback((sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
    );
  }, []);

  // ── Exercise mutations ──────────────────────────────────────────────────────

  const handleAddExercise = useCallback((sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: [...s.exercises, makeExercise()] }
          : s
      )
    );
  }, []);

  const handleExerciseChange = useCallback(
    (sessionId: string, exerciseId: string, patch: Partial<DraftExercise>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                exercises: s.exercises.map((e) =>
                  e.id === exerciseId ? { ...e, ...patch } : e
                ),
              }
            : s
        )
      );
    },
    []
  );

  const handleExerciseDelete = useCallback((sessionId: string, exerciseId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
          : s
      )
    );
  }, []);

  // ── Drag and drop ───────────────────────────────────────────────────────────

  const handleDragEnd = useCallback((sessionId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const oldIdx = s.exercises.findIndex((e) => e.id === active.id);
        const newIdx = s.exercises.findIndex((e) => e.id === over.id);
        if (oldIdx === -1 || newIdx === -1) return s;
        return { ...s, exercises: arrayMove(s.exercises, oldIdx, newIdx) };
      })
    );
  }, []);

  // ── Exercise search ─────────────────────────────────────────────────────────

  const handleSelectExercise = useCallback((item: ExerciseBrowseItem) => {
    if (!searchTarget) return;
    handleExerciseChange(searchTarget.sessionId, searchTarget.exerciseId, { name: item.name });
    setSearchTarget(null);
  }, [searchTarget, handleExerciseChange]);

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!canSave) {
      setShowErrors(true);
      return;
    }

    setIsSaving(true);
    try {
      const routine: RoutineData = {
        id: uuidv4(),
        title: title.trim(),
        createdAt: new Date(),
        sessions: sessions.map((s) => ({
          id: s.id,
          title: s.title.trim() || 'Day',
          exercises: s.exercises.map((ex) => ({
            id: ex.id,
            originalName: ex.name.trim(),
            cleanName: ex.name.trim(),
            sets: ex.sets,
            repsMin: ex.repsMin,
            repsMax: ex.repsMax,
            restSeconds: ex.restSeconds,
            mediaUrl: null,
          })),
        })),
      };

      const md = generateMarkdown(routine);
      await importRoutine(routine, md);
      // importRoutine transitions to routine-overview automatically
    } catch (err) {
      console.error('[RoutineBuilderView] save failed', err);
      setIsSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCurrentView('routine-overview')}
          className="text-white/60 hover:text-white transition-colors p-1 -ml-1"
          aria-label="Back"
        >
          <ArrowLeft size={22} />
        </button>

        <h1 className="font-display uppercase tracking-tight text-sm font-bold text-white/80 flex-1 text-center">
          Routine Builder
        </h1>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="active-glass-btn text-white text-xs px-4 py-1.5 rounded-xl font-semibold disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Routine title */}
      <div className="sunken-glass rounded-2xl px-4 py-3">
        <input
          type="text"
          value={title}
          placeholder="Routine Title"
          onChange={(e) => setTitle(e.target.value)}
          className={[
            'w-full bg-transparent text-xl font-display font-bold text-white',
            'placeholder-white/30 focus:outline-none',
            showErrors && title.trim() === '' ? 'text-red-400' : '',
          ].join(' ')}
        />
        {showErrors && title.trim() === '' && (
          <p className="text-[11px] text-red-400 mt-1">Routine title required</p>
        )}
      </div>

      {/* Sessions */}
      <AnimatePresence initial={false}>
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            canDelete={sessions.length > 1}
            showErrors={showErrors}
            onTitleChange={handleSessionTitleChange}
            onExerciseChange={handleExerciseChange}
            onExerciseDelete={handleExerciseDelete}
            onAddExercise={handleAddExercise}
            onDeleteSession={handleDeleteSession}
            onDragEnd={handleDragEnd}
            onSearchExercise={(sessionId, exerciseId) => setSearchTarget({ sessionId, exerciseId })}
          />
        ))}
      </AnimatePresence>

      {/* Add Session */}
      <motion.button
        type="button"
        onClick={handleAddSession}
        whileTap={{ scale: 0.97 }}
        className="glass-panel rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
      >
        <Plus size={16} />
        Add Session
      </motion.button>

      {/* Validation summary (only shown after first save attempt) */}
      <AnimatePresence>
        {showErrors && hasEmptyName && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-red-400"
          >
            Fill in all exercise names before saving.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Exercise library search */}
      <AnimatePresence>
        {searchTarget && (
          <SearchSheet
            onClose={() => setSearchTarget(null)}
            onSelectExercise={handleSelectExercise}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
