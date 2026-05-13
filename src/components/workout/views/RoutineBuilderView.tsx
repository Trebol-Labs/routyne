'use client';

import { useMemo, useState, useCallback, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  Dumbbell,
  GripVertical,
  Minus,
  PlayCircle,
  Plus,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/components/i18n/LanguageProvider';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { generateMarkdown } from '@/lib/markdown/generator';
import { resolveExerciseMedia } from '@/lib/media/resolver';
import type { RoutineData, ExerciseBrowseItem } from '@/types/workout';
import { SearchSheet, ExerciseSearchPanel } from '@/components/workout/overlays/SearchSheet';
import { cn } from '@/lib/utils';

interface DraftExercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  previewUrl: string | null;
}

interface DraftSession {
  id: string;
  title: string;
  exercises: DraftExercise[];
}

type SearchContext =
  | {
      intent: 'add';
      sessionId: string;
    }
  | {
      intent: 'replace';
      sessionId: string;
      exerciseId: string;
      initialQuery: string;
    }
  | null;

const REST_OPTIONS = [30, 45, 60, 90, 120, 180] as const;

function makeExercise(): DraftExercise {
  return {
    id: uuidv4(),
    name: '',
    sets: 3,
    repsMin: 8,
    repsMax: 10,
    restSeconds: 90,
    previewUrl: null,
  };
}

function makeSession(index: number, language: 'es' | 'en'): DraftSession {
  return {
    id: uuidv4(),
    title: language === 'en' ? `Day ${index}` : `Día ${index}`,
    exercises: [makeExercise()],
  };
}

function formatExerciseSummary(exercise: DraftExercise): string {
  const reps = exercise.repsMin === exercise.repsMax
    ? String(exercise.repsMin)
    : `${exercise.repsMin}-${exercise.repsMax}`;
  return `${exercise.sets}x${reps} · ${exercise.restSeconds}s`;
}

function estimateSessionMinutes(session: DraftSession): number {
  const totalSets = session.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const base = session.exercises.length * 3;
  const volume = Math.round(totalSets * 1.75);
  return Math.max(12, base + volume);
}

function SessionRail({
  sessions,
  selectedSessionId,
  onSelectSession,
  onAddSession,
}: {
  sessions: DraftSession[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onAddSession: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="glass-panel rounded-[1.6rem] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/28">
          {t.builder.days}
        </p>
        <button
          type="button"
          onClick={onAddSession}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
          aria-label={t.builder.addDay}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {sessions.map((session, index) => {
          const selected = session.id === selectedSessionId;
          const exerciseCount = session.exercises.length;
          return (
            <motion.button
              key={session.id}
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectSession(session.id)}
              className={cn(
                'min-w-[8.75rem] rounded-[1.15rem] border px-3 py-2 text-left transition-colors',
                selected
                  ? 'border-blue-400/40 bg-blue-500/12 shadow-[0_10px_24px_-18px_rgba(59,130,246,0.6)]'
                  : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
              )}
            >
              <p className={cn(
                'text-[10px] font-black uppercase tracking-[0.22em]',
                selected ? 'text-blue-200/80' : 'text-white/30'
              )}>
                {t.builder.day} {index + 1}
              </p>
              <p className="mt-1 truncate font-display text-sm font-black uppercase tracking-tight text-white">
                {session.title || `${t.builder.day} ${index + 1}`}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">
                <span>{exerciseCount} {t.summary.exercises}</span>
                <span>·</span>
                <span>~{estimateSessionMinutes(session)} min</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function ExerciseRow({
  exercise,
  isExpanded,
  isTargeted,
  showError,
  onChange,
  onDelete,
  onSearchExercise,
  onToggleExpanded,
}: {
  exercise: DraftExercise;
  isExpanded: boolean;
  isTargeted: boolean;
  showError: boolean;
  onChange: (id: string, patch: Partial<DraftExercise>) => void;
  onDelete: (id: string) => void;
  onSearchExercise: (id: string) => void;
  onToggleExpanded: (id: string) => void;
}) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
  const thumbError = exercise.previewUrl !== null && failedPreviewUrl === exercise.previewUrl;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'overflow-hidden rounded-[1.35rem] border bg-black/18 shadow-[0_16px_32px_-26px_rgba(0,0,0,0.8)]',
        isTargeted
          ? 'border-blue-400/40 ring-1 ring-blue-400/20'
          : 'border-white/8'
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="touch-none flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/35 transition-colors hover:text-white/75 active:cursor-grabbing"
          aria-label={t.builder.dragHandle}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-xl border border-white/8 bg-white/[0.04]">
          {exercise.previewUrl && !thumbError ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exercise.previewUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setFailedPreviewUrl(exercise.previewUrl ?? null)}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <PlayCircle className="h-4 w-4 text-white/70" />
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/20">
              <Dumbbell className="h-4 w-4" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleExpanded(exercise.id)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-black uppercase tracking-tight text-white">
                {exercise.name.trim() || t.builder.exerciseName}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                {formatExerciseSummary(exercise)}
              </p>
            </div>

            <div className="hidden shrink-0 gap-1.5 sm:flex">
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                {exercise.sets} {t.summary.setPlural}
              </span>
              <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                {exercise.repsMin === exercise.repsMax ? exercise.repsMin : `${exercise.repsMin}-${exercise.repsMax}`} {t.summary.reps}
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSearchExercise(exercise.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/45 transition-colors hover:border-blue-400/30 hover:bg-blue-500/12 hover:text-blue-200"
          aria-label={t.builder.searchExercise}
        >
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(exercise.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/35 transition-colors hover:border-red-400/30 hover:bg-red-500/12 hover:text-red-200"
          aria-label={t.builder.deleteExercise}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="border-t border-white/8"
          >
            <div className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(event) => onChange(exercise.id, { name: event.target.value, previewUrl: null })}
                    placeholder={t.builder.exerciseName}
                    className={[
                      'w-full rounded-2xl border bg-white/[0.03] px-3.5 py-2.5 pr-10 text-sm font-medium text-white outline-none transition-colors',
                      showError && exercise.name.trim() === ''
                        ? 'border-red-400/40'
                        : 'border-white/10 focus:border-blue-400/40',
                    ].join(' ')}
                  />
                  <button
                    type="button"
                    onClick={() => onSearchExercise(exercise.id)}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-white/8 bg-white/[0.05] text-white/45 transition-colors hover:text-white"
                    aria-label={t.builder.searchExercise}
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {showError && exercise.name.trim() === '' && (
                <p className="text-[11px] font-medium text-red-300">
                  {t.builder.exerciseRequired}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sunken-glass rounded-2xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
                    {t.summary.setPlural}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onChange(exercise.id, { sets: Math.max(1, exercise.sets - 1) })}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/50 transition-colors hover:text-white"
                      aria-label={t.builder.decreaseSets}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-0 flex-1 text-center font-display text-lg font-black text-white tabular-nums">
                      {exercise.sets}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChange(exercise.id, { sets: Math.min(10, exercise.sets + 1) })}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/50 transition-colors hover:text-white"
                      aria-label={t.builder.increaseSets}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="sunken-glass rounded-2xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
                    {t.summary.reps}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={exercise.repsMin}
                      onChange={(event) => {
                        const next = Math.max(1, parseInt(event.target.value, 10) || 1);
                        onChange(exercise.id, {
                          repsMin: next,
                          repsMax: Math.max(next, exercise.repsMax),
                        });
                      }}
                      className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-2 py-2 text-center text-sm font-semibold text-white outline-none focus:border-blue-400/40"
                      aria-label={t.builder.repsMin}
                    />
                    <span className="text-white/35">–</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={exercise.repsMax}
                      onChange={(event) => {
                        const next = Math.max(1, parseInt(event.target.value, 10) || 1);
                        onChange(exercise.id, {
                          repsMax: next,
                          repsMin: Math.min(exercise.repsMin, next),
                        });
                      }}
                      className="w-full rounded-xl border border-white/8 bg-white/[0.04] px-2 py-2 text-center text-sm font-semibold text-white outline-none focus:border-blue-400/40"
                      aria-label={t.builder.repsMax}
                    />
                  </div>
                </div>

                <div className="sunken-glass rounded-2xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
                    {t.builder.rest}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {REST_OPTIONS.map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        onClick={() => onChange(exercise.id, { restSeconds: seconds })}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] transition-colors',
                          exercise.restSeconds === seconds
                            ? 'active-glass-btn text-white'
                            : 'border-white/8 bg-white/[0.04] text-white/45 hover:text-white/70'
                        )}
                      >
                        {seconds}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SessionCard({
  session,
  canDelete,
  showErrors,
  isActive,
  expandedExerciseId,
  targetExerciseId,
  onTitleChange,
  onExerciseChange,
  onExerciseDelete,
  onAddExercise,
  onAddSession,
  onDeleteSession,
  onDragEnd,
  onSearchExercise,
  onToggleExercise,
}: {
  session: DraftSession;
  canDelete: boolean;
  showErrors: boolean;
  isActive: boolean;
  expandedExerciseId: string | null;
  targetExerciseId: string | null;
  onTitleChange: (id: string, title: string) => void;
  onExerciseChange: (sessionId: string, exerciseId: string, patch: Partial<DraftExercise>) => void;
  onExerciseDelete: (sessionId: string, exerciseId: string) => void;
  onAddExercise: (sessionId: string) => void;
  onAddSession: () => void;
  onDeleteSession: (id: string) => void;
  onDragEnd: (sessionId: string, event: DragEndEvent) => void;
  onSearchExercise: (sessionId: string, exerciseId: string) => void;
  onToggleExercise: (exerciseId: string) => void;
}) {
  const { t } = useI18n();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const totalSets = session.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const estimatedMinutes = estimateSessionMinutes(session);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'glass-panel rounded-[1.9rem] p-4',
        isActive ? 'border-blue-400/25 shadow-[0_20px_50px_-30px_rgba(59,130,246,0.55)]' : ''
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/26">
            {t.builder.day}
          </p>
          <input
            type="text"
            value={session.title}
            placeholder={t.builder.sessionTitle}
            onChange={(event) => onTitleChange(session.id, event.target.value)}
            className={[
              'mt-1 w-full bg-transparent font-display text-2xl font-black uppercase tracking-tight text-white placeholder:text-white/26 outline-none',
              showErrors && session.title.trim() === '' ? 'text-red-300' : '',
            ].join(' ')}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              {session.exercises.length} {t.summary.exercises}
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              {totalSets} {t.summary.setPlural}
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              ~{estimatedMinutes} min
            </span>
          </div>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteSession(session.id)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/35 transition-colors hover:border-red-400/30 hover:bg-red-500/12 hover:text-red-200"
            aria-label={t.builder.deleteSession}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => onDragEnd(session.id, event)}
        >
          <SortableContext
            items={session.exercises.map((exercise) => exercise.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {session.exercises.map((exercise) => (
                  <ExerciseRow
                    key={exercise.id}
                    exercise={exercise}
                    isExpanded={expandedExerciseId === exercise.id}
                    isTargeted={targetExerciseId === exercise.id}
                    showError={showErrors}
                    onChange={(exerciseId, patch) => onExerciseChange(session.id, exerciseId, patch)}
                    onDelete={(exerciseId) => onExerciseDelete(session.id, exerciseId)}
                    onSearchExercise={(exerciseId) => onSearchExercise(session.id, exerciseId)}
                    onToggleExpanded={onToggleExercise}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button
          variant="glass-primary"
          size="lg"
          onClick={() => onAddExercise(session.id)}
          className="gap-2 rounded-[1.25rem] px-4 py-3 text-[11px] tracking-[0.16em]"
        >
          <PlusCircle className="h-4 w-4" />
          {t.builder.addExercise}
        </Button>
        <Button
          variant="glass"
          size="lg"
          onClick={onAddSession}
          className="gap-2 rounded-[1.25rem] px-4 py-3 text-[11px] tracking-[0.16em]"
        >
          <Plus className="h-4 w-4" />
          {t.builder.addDay}
        </Button>
      </div>
    </motion.section>
  );
}

export function RoutineBuilderView() {
  const { t, language } = useI18n();
  const setCurrentView = useWorkoutStore((state) => state.setCurrentView);
  const importRoutine = useWorkoutStore((state) => state.importRoutine);

  const [title, setTitle] = useState(() => t.builder.routineName);
  const [sessions, setSessions] = useState<DraftSession[]>(() => [makeSession(1, language)]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchContext, setSearchContext] = useState<SearchContext>(null);

  const activeSessionId = selectedSessionId && sessions.some((session) => session.id === selectedSessionId)
    ? selectedSessionId
    : sessions[0]?.id ?? null;

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null,
    [activeSessionId, sessions]
  );

  const hasEmptyName = sessions.some((session) =>
    session.exercises.some((exercise) => exercise.name.trim() === '')
  );
  const canSave = title.trim() !== '' && !hasEmptyName;

  const handleSelectSession = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSearchContext(null);
    setExpandedExerciseId(null);
  }, []);

  const handleAddSession = useCallback(() => {
    setSessions((current) => {
      const next = [...current, makeSession(current.length + 1, language)];
      setSelectedSessionId(next[next.length - 1]?.id ?? null);
      setExpandedExerciseId(null);
      setSearchContext(null);
      return next;
    });
  }, [language]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    setSessions((current) => {
      const next = current.filter((session) => session.id !== sessionId);
      if (next.length === 0) {
        const fallback = [makeSession(1, language)];
        setSelectedSessionId(fallback[0].id);
        setExpandedExerciseId(null);
        setSearchContext(null);
        return fallback;
      }

      if (selectedSessionId === sessionId) {
        setSelectedSessionId(next[0].id);
      }
      if (searchContext?.sessionId === sessionId) {
        setSearchContext(null);
      }
      if (next.every((session) => session.exercises.every((exercise) => exercise.id !== expandedExerciseId))) {
        setExpandedExerciseId(null);
      }
      return next;
    });
  }, [expandedExerciseId, language, searchContext?.sessionId, selectedSessionId]);

  const handleSessionTitleChange = useCallback((sessionId: string, newTitle: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, title: newTitle } : session
      )
    );
  }, []);

  const handleAddExercise = useCallback((sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSearchContext({ intent: 'add', sessionId });
    setExpandedExerciseId(null);
  }, []);

  const handleExerciseChange = useCallback(
    (sessionId: string, exerciseId: string, patch: Partial<DraftExercise>) => {
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                exercises: session.exercises.map((exercise) =>
                  exercise.id === exerciseId ? { ...exercise, ...patch } : exercise
                ),
              }
            : session
        )
      );
    },
    []
  );

  const handleExerciseDelete = useCallback((sessionId: string, exerciseId: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, exercises: session.exercises.filter((exercise) => exercise.id !== exerciseId) }
          : session
      )
    );

    setExpandedExerciseId((current) => (current === exerciseId ? null : current));
    setSearchContext((current) =>
      current?.sessionId === sessionId && current.intent === 'replace' && current.exerciseId === exerciseId
        ? null
        : current
    );
  }, []);

  const handleDragEnd = useCallback((sessionId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) return session;
        const oldIndex = session.exercises.findIndex((exercise) => exercise.id === active.id);
        const newIndex = session.exercises.findIndex((exercise) => exercise.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return session;
        return { ...session, exercises: arrayMove(session.exercises, oldIndex, newIndex) };
      })
    );
  }, []);

  const handleCommitExercise = useCallback((item: ExerciseBrowseItem) => {
    const previewUrl = item.mediaUrl ?? item.gifUrl ?? null;
    const targetSessionId = searchContext?.sessionId ?? selectedSession?.id;

    if (!targetSessionId) return;

    if (searchContext?.intent === 'replace') {
      setSessions((current) =>
        current.map((session) =>
          session.id === searchContext.sessionId
            ? {
                ...session,
                exercises: session.exercises.map((exercise) =>
                  exercise.id === searchContext.exerciseId
                    ? {
                        ...exercise,
                        name: item.name,
                        previewUrl,
                      }
                    : exercise
                ),
              }
            : session
        )
      );

      setExpandedExerciseId(searchContext.exerciseId);
      setSearchContext(null);
      return;
    }

    const exercise = makeExercise();
    setSessions((current) =>
      current.map((session) =>
        session.id === targetSessionId
          ? {
              ...session,
              exercises: [...session.exercises, { ...exercise, name: item.name, previewUrl }],
            }
          : session
      )
    );

    setExpandedExerciseId(exercise.id);
    setSearchContext(null);
  }, [searchContext, selectedSession?.id]);

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
        sessions: sessions.map((session) => ({
          id: session.id,
          title: session.title.trim() || t.builder.day,
          exercises: session.exercises.map((exercise) => ({
            id: exercise.id,
            originalName: exercise.name.trim(),
            cleanName: exercise.name.trim(),
            sets: exercise.sets,
            repsMin: exercise.repsMin,
            repsMax: exercise.repsMax,
            restSeconds: exercise.restSeconds,
            mediaUrl: resolveExerciseMedia(exercise.name.trim()),
          })),
        })),
      };

      const markdown = generateMarkdown(routine);
      await importRoutine(routine, markdown);
    } catch (error) {
      console.error('[RoutineBuilderView] save failed', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSessionIndex = selectedSession
    ? sessions.findIndex((session) => session.id === selectedSession.id) + 1
    : 1;
  const searchSession = searchContext
    ? sessions.find((session) => session.id === searchContext.sessionId) ?? null
    : selectedSession;
  const searchTargetExercise = searchContext?.intent === 'replace'
    ? searchSession?.exercises.find((exercise) => exercise.id === searchContext.exerciseId) ?? null
    : null;
  const searchIntent = searchContext?.intent ?? 'add';
  const searchTargetLabel = searchContext?.intent === 'replace'
    ? searchTargetExercise?.name.trim() || null
    : searchSession?.title.trim() || `${t.builder.day} ${selectedSessionIndex}`;
  const searchInitialQuery = searchContext?.intent === 'replace' ? searchTargetExercise?.name ?? '' : '';
  const showSearchOverlay = Boolean(searchContext);

  return (
    <div className="flex min-w-0 flex-col gap-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCurrentView('routine-overview')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-white/60 transition-colors hover:text-white"
            aria-label={t.builder.back}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="flex-1 text-center font-display text-sm font-black uppercase tracking-[0.24em] text-white/80">
            {t.builder.title}
          </h1>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-[1.1rem] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-50"
            variant="glass-primary"
          >
            {isSaving ? t.builder.saving : t.builder.save}
          </Button>
        </div>

        <div className="sunken-glass rounded-[1.8rem] px-4 py-3">
          <input
            type="text"
            value={title}
            placeholder={t.builder.routineName}
            onChange={(event) => setTitle(event.target.value)}
            className={[
              'w-full bg-transparent text-2xl font-display font-black uppercase tracking-tight text-white outline-none placeholder:text-white/28',
              showErrors && title.trim() === '' ? 'text-red-300' : '',
            ].join(' ')}
          />
          {showErrors && title.trim() === '' && (
            <p className="mt-1 text-[11px] font-medium text-red-300">
              {t.builder.routineTitleRequired}
            </p>
          )}
        </div>

        <SessionRail
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
          onAddSession={handleAddSession}
        />

        <AnimatePresence mode="wait">
          {selectedSession && (
            <SessionCard
              key={selectedSession.id}
              session={selectedSession}
              canDelete={sessions.length > 1}
              showErrors={showErrors}
              isActive
              expandedExerciseId={expandedExerciseId}
              onTitleChange={handleSessionTitleChange}
              onExerciseChange={handleExerciseChange}
              onExerciseDelete={handleExerciseDelete}
              onAddExercise={handleAddExercise}
              onAddSession={handleAddSession}
              onDeleteSession={handleDeleteSession}
              onDragEnd={handleDragEnd}
              onSearchExercise={(sessionId, exerciseId) => {
                const session = sessions.find((item) => item.id === sessionId);
                const exercise = session?.exercises.find((item) => item.id === exerciseId);
                setSearchContext({
                  intent: 'replace',
                  sessionId,
                  exerciseId,
                  initialQuery: exercise?.name ?? '',
                });
              }}
              onToggleExercise={(exerciseId) =>
                setExpandedExerciseId((current) => (current === exerciseId ? null : exerciseId))
              }
              targetExerciseId={searchContext?.intent === 'replace' && searchContext.sessionId === selectedSession.id
                ? searchContext.exerciseId
                : null}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showErrors && hasEmptyName && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs font-medium text-red-300"
            >
              {t.builder.exerciseRequired}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden lg:block lg:sticky lg:top-4">
        <ExerciseSearchPanel
          embedded
          intent={searchIntent}
          targetLabel={searchTargetLabel}
          initialQuery={searchInitialQuery}
          autoFocusInput={Boolean(searchContext)}
          onCommit={handleCommitExercise}
        />
      </div>

      <div className="lg:hidden">
        {showSearchOverlay && (
          <SearchSheet
            intent={searchIntent}
            targetLabel={searchTargetLabel}
            initialQuery={searchInitialQuery}
            autoFocusInput
            onClose={() => setSearchContext(null)}
            onCommit={handleCommitExercise}
          />
        )}
      </div>
    </div>
  );
}
