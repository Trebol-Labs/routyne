'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Dumbbell, PlayCircle, Check } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/i18n/LanguageProvider';
import type { ExerciseBrowseItem } from '@/types/workout';

type BodyPartFilter =
  | 'all'
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core';

type EquipmentFilter =
  | 'all'
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'body weight'
  | 'kettlebell'
  | 'other';

const BODY_PART_FILTERS: BodyPartFilter[] = ['all', 'chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
const EQUIPMENT_FILTERS: EquipmentFilter[] = ['all', 'barbell', 'dumbbell', 'cable', 'machine', 'body weight', 'kettlebell', 'other'];

interface ExerciseSearchPanelProps {
  onClose?: () => void;
  onSelectExercise?: (exercise: ExerciseBrowseItem) => void;
  actionLabel?: string;
  targetLabel?: string | null;
  embedded?: boolean;
}

function ExerciseThumbnail({
  item,
  className,
}: {
  item: ExerciseBrowseItem;
  className?: string;
}) {
  const mediaUrl = item.mediaUrl ?? item.gifUrl ?? null;
  const [failedMediaUrl, setFailedMediaUrl] = useState<string | null>(null);
  const loadError = mediaUrl !== null && failedMediaUrl === mediaUrl;

  if (!mediaUrl || loadError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/25',
          className
        )}
      >
        <Dumbbell className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaUrl}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => setFailedMediaUrl(mediaUrl)}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/12">
        <PlayCircle className="h-5 w-5 text-white/70 drop-shadow" />
      </div>
    </div>
  );
}

function ExerciseResultRow({
  item,
  isSelected,
  onSelect,
}: {
  item: ExerciseBrowseItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        'group flex w-full items-center gap-3 rounded-[1.15rem] border px-3 py-2.5 text-left transition-colors',
        isSelected
          ? 'border-blue-400/40 bg-blue-500/10'
          : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]'
      )}
    >
      <ExerciseThumbnail item={item} className="h-12 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold tracking-tight text-white">{item.name}</p>
        <p className="mt-0.5 truncate text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
          {item.bodyPart} · {item.equipment}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em]',
          isSelected
            ? 'border-blue-400/30 bg-blue-500/15 text-blue-200'
            : 'border-white/10 bg-white/[0.04] text-white/45 group-hover:text-white/65'
        )}
      >
        Demo
      </span>
    </motion.button>
  );
}

function SearchPanelContent({
  onClose,
  onSelectExercise,
  actionLabel,
  targetLabel,
  embedded = false,
}: ExerciseSearchPanelProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPartFilter>('all');
  const [equipment, setEquipment] = useState<EquipmentFilter>('all');
  const [results, setResults] = useState<ExerciseBrowseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const requestRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedExercise = useMemo(
    () => results.find((item) => item.id === selectedExerciseId) ?? results[0] ?? null,
    [results, selectedExerciseId]
  );

  useEffect(() => {
    if (requestRef.current) clearTimeout(requestRef.current);

    requestRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (bodyPart !== 'all') params.set('bodyPart', bodyPart);
        if (equipment !== 'all') params.set('equipment', equipment);
        params.set('limit', '12');

        const response = await fetch(`/api/exercises/browse?${params.toString()}`);
        const data = (await response.json()) as ExerciseBrowseItem[];
        setResults(data);
      } catch (err) {
        console.error('[SearchSheet] browse search failed', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => {
      if (requestRef.current) clearTimeout(requestRef.current);
    };
  }, [query, bodyPart, equipment]);

  useEffect(() => {
    if (results.length === 0) {
      setSelectedExerciseId(null);
      return;
    }

    if (!selectedExerciseId || !results.some((item) => item.id === selectedExerciseId)) {
      setSelectedExerciseId(results[0].id);
    }
  }, [results, selectedExerciseId]);

  useEffect(() => {
    setMediaError(false);
  }, [selectedExercise?.id]);

  const commitLabel = actionLabel ?? t.search.selectRowHint;
  const canCommit = Boolean(actionLabel && selectedExercise && onSelectExercise);
  const resultCountLabel = results.length === 0
    ? t.search.noExercises
    : `${results.length.toLocaleString()} ${results.length === 1 ? t.search.resultSingular : t.search.resultPlural}`;

  const surfaceClassName = embedded
    ? 'glass-panel rounded-[2rem] p-4 flex min-h-[32rem] flex-col gap-3 overflow-hidden'
    : 'h-full px-4 pb-4 flex flex-col gap-3 overflow-hidden';

  return (
    <div className={surfaceClassName}>
      <div className="shrink-0 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/30">
            {t.builder.searchExercise}
          </p>
          <h3 className="mt-1 font-display text-sm font-black uppercase tracking-tight text-white">
            {t.search.title}
          </h3>
          {targetLabel ? (
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/70">
              {t.search.targeting} {targetLabel}
            </p>
          ) : (
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/25">
              {actionLabel ? t.search.preview : t.search.selectRowHint}
            </p>
          )}
        </div>

        {!embedded && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label={t.search.close}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="shrink-0 relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.search.searchExercises}
          className="sunken-glass h-11 w-full rounded-2xl border-none bg-transparent pl-9 pr-3 text-sm font-medium text-white placeholder:text-white/22 outline-none"
        />
      </div>

      <div className="shrink-0 space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {BODY_PART_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setBodyPart(filter)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-colors',
                bodyPart === filter
                  ? 'active-glass-btn text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/45 hover:text-white/70'
              )}
            >
              {t.search.bodyPartLabels[filter]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {EQUIPMENT_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setEquipment(filter)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-colors',
                equipment === filter
                  ? 'active-glass-btn text-white'
                  : 'border-white/10 bg-white/[0.04] text-white/45 hover:text-white/70'
              )}
            >
              {t.search.equipmentLabels[filter]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
              {resultCountLabel}
            </p>
          </div>

          <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto overscroll-contain pr-1 no-scrollbar">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-[4.35rem] rounded-[1.15rem] bg-white/5" />
              ))
            ) : results.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-white/8 bg-white/[0.03] text-center">
                <Dumbbell className="h-6 w-6 text-white/15" />
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">
                  {t.search.noExercises}
                </p>
              </div>
            ) : (
              results.map((item) => (
                <ExerciseResultRow
                  key={item.id}
                  item={item}
                  isSelected={selectedExercise?.id === item.id}
                  onSelect={() => setSelectedExerciseId(item.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
              {t.search.preview}
            </p>
            {selectedExercise && (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                {selectedExercise.difficulty ?? t.search.demo}
              </span>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-3">
            {selectedExercise ? (
              <>
                <div className="relative overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/25">
                  <div className="aspect-[4/3] w-full">
                    {!mediaError && (selectedExercise.mediaUrl ?? selectedExercise.gifUrl) ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedExercise.mediaUrl ?? selectedExercise.gifUrl ?? ''}
                          alt={`${selectedExercise.name} demo`}
                          className="h-full w-full object-cover"
                          onError={() => setMediaError(true)}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <PlayCircle className="h-12 w-12 text-white/75 drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Dumbbell className="h-10 w-10 text-white/20" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate font-display text-lg font-black uppercase tracking-tight text-white">
                        {selectedExercise.name}
                      </h4>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                        {selectedExercise.bodyPart} · {selectedExercise.equipment}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {selectedExercise.target && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
                        {t.search.target} {selectedExercise.target}
                      </span>
                    )}
                    {selectedExercise.secondaryMuscles?.[0] && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/50">
                        {t.search.secondary} {selectedExercise.secondaryMuscles[0]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
                    {t.search.formCues}
                  </p>

                  {selectedExercise.instructions?.length ? (
                    <ul className="space-y-1 text-sm text-white/70">
                      {selectedExercise.instructions.slice(0, 3).map((cue) => (
                        <li key={cue} className="flex gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                          <span className="leading-snug">{cue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-relaxed text-white/45">
                      {t.search.noDemo}
                    </p>
                  )}
                </div>

                <div className="mt-auto space-y-2">
                  <button
                    type="button"
                    disabled={!canCommit || !selectedExercise}
                    onClick={() => {
                      if (!canCommit || !selectedExercise || !onSelectExercise) return;
                      onSelectExercise(selectedExercise);
                      onClose?.();
                    }}
                    className={cn(
                      'flex w-full items-center justify-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition-colors',
                      canCommit
                        ? 'active-glass-btn text-white'
                        : 'cursor-not-allowed border border-white/8 bg-white/[0.04] text-white/30'
                    )}
                  >
                    <Check className="h-4 w-4" />
                    {commitLabel}
                  </button>

                  {!actionLabel && (
                    <p className="text-center text-[10px] font-black uppercase tracking-[0.22em] text-white/24">
                      {t.search.selectRowHint}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-2 text-center">
                <Dumbbell className="h-10 w-10 text-white/15" />
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/25">
                  {t.search.noExercises}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type SearchSheetProps = ExerciseSearchPanelProps;

export function SearchSheet(props: SearchSheetProps) {
  const { t } = useI18n();

  if (props.embedded) {
    return <SearchPanelContent {...props} />;
  }

  return (
    <Sheet onClose={props.onClose ?? (() => undefined)} title={t.builder.searchExercise} height="84vh">
      <SearchPanelContent {...props} />
    </Sheet>
  );
}

export { SearchPanelContent as ExerciseSearchPanel };
