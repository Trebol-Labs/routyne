'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

type BrowseStatus = 'loading' | 'success' | 'empty' | 'error';

interface ExerciseSearchPickerProps {
  intent: 'add' | 'replace';
  targetLabel?: string | null;
  onCommit: (exercise: ExerciseBrowseItem) => void;
  onClose?: () => void;
  embedded?: boolean;
  initialQuery?: string;
  autoFocusInput?: boolean;
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
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/12">
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
      data-testid="exercise-search-result"
      data-exercise-name={item.name}
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

function SearchStatusCard({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-full min-h-0 flex-col items-center justify-center rounded-[1.25rem] border border-white/8 bg-white/[0.03] text-center',
        compact ? 'gap-1.5 px-3 py-3' : 'min-h-[12rem] gap-2 px-4 py-4'
      )}
    >
      <div className={cn(
        'flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] text-white/55',
        compact ? 'h-9 w-9' : 'h-11 w-11'
      )}>
        <Icon className={cn(compact ? 'h-4 w-4' : 'h-5 w-5', Icon === Loader2 && 'animate-spin')} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/65">
        {title}
      </p>
      {body && (
        <p className={cn(
          'max-w-[18rem] leading-relaxed text-white/42',
          compact ? 'text-[11px]' : 'text-sm'
        )}>
          {body}
        </p>
      )}
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SearchCommitButton({
  intent,
  commitLabel,
  canCommit,
  onCommit,
  compact = false,
}: {
  intent: 'add' | 'replace';
  commitLabel: string;
  canCommit: boolean;
  onCommit: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      data-testid="exercise-search-commit"
      disabled={!canCommit}
      onClick={onCommit}
      className={cn(
        'flex w-full items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left transition-colors',
        compact ? 'px-3 py-2.5' : '',
        canCommit
          ? 'active-glass-btn text-white'
          : 'cursor-not-allowed border-white/8 bg-white/[0.04] text-white/30'
      )}
    >
      <Check className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-black uppercase tracking-[0.18em]">
          {intent === 'replace' ? t.search.replaceWith : t.search.addTo}
        </span>
        <span className="block truncate text-sm font-black uppercase tracking-[0.18em]">
          {commitLabel}
        </span>
      </span>
    </button>
  );
}

function SearchPreviewPane({
  compact,
  status,
  selectedExercise,
  mediaError,
  commitLabel,
  canCommit,
  onCommit,
  onRetry,
  onMediaError,
  intent,
  showCommitButton = true,
}: {
  compact: boolean;
  status: BrowseStatus;
  selectedExercise: ExerciseBrowseItem | null;
  mediaError: boolean;
  commitLabel: string;
  canCommit: boolean;
  onCommit: () => void;
  onRetry: () => void;
  onMediaError: () => void;
  intent: 'add' | 'replace';
  showCommitButton?: boolean;
}) {
  const { t } = useI18n();

  const panelClassName = cn(
    'flex min-h-0 flex-1 flex-col gap-3 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-3',
    compact ? 'justify-between' : '',
    !showCommitButton ? 'overflow-hidden' : ''
  );

  const footer = showCommitButton ? (
    <SearchCommitButton
      intent={intent}
      commitLabel={commitLabel}
      canCommit={canCommit}
      onCommit={onCommit}
      compact={compact}
    />
  ) : null;

  if (status === 'loading') {
    return (
      <div className={panelClassName} data-testid="exercise-search-preview">
        <div className="flex items-center gap-2 text-white/45">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.24em]">{t.search.loading}</p>
        </div>
        {compact ? (
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-[1.2rem] bg-white/5" />
            <Skeleton className="h-4 w-5/6 rounded-full bg-white/5" />
            <Skeleton className="h-4 w-2/3 rounded-full bg-white/5" />
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="aspect-[4/3] rounded-[1.2rem] bg-white/5" />
            <Skeleton className="h-6 w-5/6 rounded-full bg-white/5" />
            <Skeleton className="h-4 w-2/3 rounded-full bg-white/5" />
            <Skeleton className="h-32 rounded-[1.2rem] bg-white/5" />
          </div>
        )}
        {footer}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={panelClassName} data-testid="exercise-search-preview">
        <SearchStatusCard
          compact={compact}
          icon={AlertTriangle}
          title={t.search.loadError}
          body={t.search.previewHint}
          actionLabel={t.search.retry}
          onAction={onRetry}
        />
        {footer}
      </div>
    );
  }

  if (!selectedExercise) {
    return (
      <div className={panelClassName} data-testid="exercise-search-preview">
        <SearchStatusCard
          compact={compact}
          icon={Dumbbell}
          title={t.search.noExercises}
          body={t.search.previewHint}
        />
        {footer}
      </div>
    );
  }

  return (
    <div className={panelClassName} data-testid="exercise-search-preview">
      <div className={cn('flex min-h-0 flex-1 flex-col gap-3', compact ? '' : 'overflow-y-auto overscroll-contain pr-1 no-scrollbar')}>
        <div className="relative overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/25">
          <div className={cn('w-full', compact ? 'aspect-[16/10]' : 'aspect-[4/3]')}>
            {mediaError || (!selectedExercise.mediaUrl && !selectedExercise.gifUrl) ? (
              <div className="flex h-full w-full items-center justify-center">
                <Dumbbell className="h-10 w-10 text-white/20" />
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedExercise.mediaUrl ?? selectedExercise.gifUrl ?? ''}
                  alt={`${selectedExercise.name} demo`}
                  className="h-full w-full object-cover"
                  onError={onMediaError}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
                  <PlayCircle className="h-12 w-12 text-white/75 drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className={cn(
                'truncate font-display font-black uppercase tracking-tight text-white',
                compact ? 'text-base' : 'text-lg'
              )}>
                {selectedExercise.name}
              </h4>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                {selectedExercise.bodyPart} · {selectedExercise.equipment}
              </p>
            </div>

            {selectedExercise.difficulty && (
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                {selectedExercise.difficulty}
              </span>
            )}
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

        {!compact && (
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
        )}
      </div>

      {footer}
    </div>
  );
}

function SearchMobileActionBar({
  status,
  selectedExercise,
  mediaError,
  commitLabel,
  canCommit,
  onCommit,
  onRetry,
  onMediaError,
  intent,
  targetText,
}: {
  status: BrowseStatus;
  selectedExercise: ExerciseBrowseItem | null;
  mediaError: boolean;
  commitLabel: string;
  canCommit: boolean;
  onCommit: () => void;
  onRetry: () => void;
  onMediaError: () => void;
  intent: 'add' | 'replace';
  targetText: string | null;
}) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  const contextLabel = `${intent === 'replace' ? t.search.replacing : t.search.addingTo}${targetText ? ` ${targetText}` : ''}`;

  if (!selectedExercise || status !== 'success') {
    return (
      <div className="lg:hidden shrink-0 border-t border-white/8 bg-[rgba(4,8,18,0.9)] px-4 pt-3 backdrop-blur-xl">
        <div data-testid="exercise-search-mobile-bar" className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-3">
          <SearchStatusCard
            compact
            icon={status === 'loading' ? Loader2 : status === 'error' ? AlertTriangle : Dumbbell}
            title={
              status === 'loading'
                ? t.search.loading
                : status === 'error'
                  ? t.search.loadError
                  : t.search.noExercises
            }
            body={t.search.previewHint}
            actionLabel={status === 'error' ? t.search.retry : undefined}
            onAction={status === 'error' ? onRetry : undefined}
          />
          <div className="mt-3">
            <SearchCommitButton
              intent={intent}
              commitLabel={commitLabel}
              canCommit={canCommit}
              onCommit={onCommit}
              compact
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:hidden shrink-0 border-t border-white/8 bg-[rgba(4,8,18,0.9)] px-4 pt-3 backdrop-blur-xl">
      <div className="space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <AnimatePresence initial={false}>
          {showDetails && (
            <motion.div
              key="mobile-preview"
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 8, height: 0 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden rounded-[1.35rem] border border-white/8 bg-white/[0.03]"
            >
              <div className="max-h-[min(34dvh,20rem)] overflow-y-auto overscroll-contain p-3 no-scrollbar">
                <SearchPreviewPane
                  compact
                  status={status}
                  selectedExercise={selectedExercise}
                  mediaError={mediaError}
                  commitLabel={commitLabel}
                  canCommit={canCommit}
                  onCommit={onCommit}
                  onRetry={onRetry}
                  onMediaError={onMediaError}
                  intent={intent}
                  showCommitButton={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          data-testid="exercise-search-mobile-bar"
          className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-3 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-start gap-3">
            <ExerciseThumbnail item={selectedExercise} className="h-12 w-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/70">
                {contextLabel}
              </p>
              <h4 className="truncate font-display text-sm font-black uppercase tracking-tight text-white">
                {selectedExercise.name}
              </h4>
              <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                {selectedExercise.bodyPart} · {selectedExercise.equipment}
              </p>
            </div>

            {selectedExercise.difficulty && (
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">
                {selectedExercise.difficulty}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <SearchCommitButton
              intent={intent}
              commitLabel={commitLabel}
              canCommit={canCommit}
              onCommit={onCommit}
              compact
            />
            <button
              type="button"
              onClick={() => setShowDetails((current) => !current)}
              className="flex h-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/55 transition-colors hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
              aria-label={showDetails ? t.search.hidePreviewDetails : t.search.showPreviewDetails}
            >
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExerciseSearchPicker({
  intent,
  targetLabel,
  onCommit,
  onClose,
  embedded = false,
  initialQuery,
  autoFocusInput = false,
}: ExerciseSearchPickerProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery ?? '');
  const [bodyPart, setBodyPart] = useState<BodyPartFilter>('all');
  const [equipment, setEquipment] = useState<EquipmentFilter>('all');
  const [results, setResults] = useState<ExerciseBrowseItem[]>([]);
  const [status, setStatus] = useState<BrowseStatus>('loading');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(initialQuery ?? '');
  }, [initialQuery]);

  useEffect(() => {
    if (!autoFocusInput) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [autoFocusInput]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const requestId = ++requestRef.current;
    setStatus('loading');

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (bodyPart !== 'all') params.set('bodyPart', bodyPart);
        if (equipment !== 'all') params.set('equipment', equipment);
        params.set('limit', '12');

        const response = await fetch(`/api/exercises/browse?${params.toString()}`);
        if (!response.ok) throw new Error(`Exercise browse request failed: ${response.status}`);

        const data = (await response.json()) as ExerciseBrowseItem[];
        if (requestId !== requestRef.current) return;

        setResults(Array.isArray(data) ? data : []);
        setStatus(Array.isArray(data) && data.length > 0 ? 'success' : 'empty');
      } catch (err) {
        if (requestId !== requestRef.current) return;
        console.error('[SearchSheet] browse search failed', err);
        setResults([]);
        setStatus('error');
      }
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bodyPart, equipment, query, searchNonce]);

  useEffect(() => {
    if (status !== 'success' || results.length === 0) {
      setSelectedExerciseId(null);
      setMediaError(false);
      return;
    }

    if (!selectedExerciseId || !results.some((item) => item.id === selectedExerciseId)) {
      setSelectedExerciseId(results[0].id);
    }
  }, [results, selectedExerciseId, status]);

  useEffect(() => {
    setMediaError(false);
  }, [selectedExerciseId]);

  const selectedExercise = useMemo(
    () => (status === 'success' && results.length > 0
      ? results.find((item) => item.id === selectedExerciseId) ?? results[0] ?? null
      : null),
    [results, selectedExerciseId, status]
  );

  const targetText = targetLabel?.trim() || null;
  const selectedExerciseName = selectedExercise?.name.trim() || null;
  const commitLabel = selectedExerciseName
    ? (intent === 'replace'
      ? t.search.commitReplaceSelected.replace('{name}', selectedExerciseName)
      : t.search.commitAddSelected.replace('{name}', selectedExerciseName))
    : intent === 'replace'
      ? t.search.replaceWith
      : t.search.addTo;
  const statusLabel = status === 'loading'
    ? t.search.loading
    : status === 'error'
      ? t.search.loadError
      : results.length === 0
        ? t.search.noExercises
        : `${results.length.toLocaleString()} ${results.length === 1 ? t.search.resultSingular : t.search.resultPlural}`;
  const canCommit = Boolean(selectedExercise && status === 'success');
  const surfaceClassName = embedded
    ? 'glass-panel rounded-[1.9rem] p-4 flex min-h-0 w-full max-h-[calc(100dvh-var(--space-nav-clear)-1rem)] flex-col gap-3 overflow-hidden'
    : 'flex h-full min-h-0 flex-col gap-3 overflow-hidden px-4 pb-4';

  const handleCommit = () => {
    if (!canCommit || !selectedExercise) return;
    onCommit(selectedExercise);
    if (!embedded) onClose?.();
  };

  return (
    <div className={surfaceClassName} data-testid="exercise-search-panel">
      <div className="shrink-0 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {embedded ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/30">
                {t.builder.searchExercise}
              </p>
              <h3 className="mt-1 font-display text-sm font-black uppercase tracking-tight text-white">
                {t.search.title}
              </h3>
            </>
          ) : (
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/32">
              {t.search.title}
            </p>
          )}
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-200/70">
            {intent === 'replace' ? t.search.replacing : t.search.addingTo}
            {targetText ? ` ${targetText}` : ''}
          </p>
        </div>
      </div>

      <div className="shrink-0 relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
        <input
          ref={inputRef}
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/28">
              {statusLabel}
            </p>
            {status === 'success' && results.length > 0 && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/24">
                {t.search.previewHint}
              </p>
            )}
          </div>

          <div
            data-testid="exercise-search-results"
            className="flex-1 min-h-0 space-y-1.5 overflow-y-auto overscroll-contain pr-1 no-scrollbar"
          >
            {status === 'loading' ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-[4.35rem] rounded-[1.15rem] bg-white/5" />
              ))
            ) : status === 'error' ? (
              <div className="flex h-full min-h-[18rem] items-stretch">
                <SearchStatusCard
                  icon={AlertTriangle}
                  title={t.search.loadError}
                  body={t.search.previewHint}
                  actionLabel={t.search.retry}
                  onAction={() => setSearchNonce((current) => current + 1)}
                />
              </div>
            ) : results.length === 0 ? (
              <SearchStatusCard
                icon={Dumbbell}
                title={t.search.noExercises}
                body={t.search.previewHint}
              />
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

        <div className="hidden min-h-0 flex-col gap-2 lg:flex">
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

          <SearchPreviewPane
            compact={false}
            status={status}
            selectedExercise={selectedExercise}
            mediaError={mediaError}
            commitLabel={commitLabel}
            canCommit={canCommit}
            onCommit={handleCommit}
            onRetry={() => setSearchNonce((current) => current + 1)}
            onMediaError={() => setMediaError(true)}
            intent={intent}
          />
        </div>

      </div>

      <SearchMobileActionBar
        key={`${status}-${selectedExercise?.id ?? 'none'}`}
        status={status}
        selectedExercise={selectedExercise}
        mediaError={mediaError}
        commitLabel={commitLabel}
        canCommit={canCommit}
        onCommit={handleCommit}
        onRetry={() => setSearchNonce((current) => current + 1)}
        onMediaError={() => setMediaError(true)}
        intent={intent}
        targetText={targetText}
      />
    </div>
  );
}

type SearchSheetProps = ExerciseSearchPickerProps;

export function SearchSheet(props: SearchSheetProps) {
  const { t } = useI18n();

  if (props.embedded) {
    return <ExerciseSearchPicker {...props} />;
  }

  return (
    <Sheet onClose={props.onClose ?? (() => undefined)} title={t.search.title} height="84vh">
      <ExerciseSearchPicker {...props} />
    </Sheet>
  );
}

export { ExerciseSearchPicker as ExerciseSearchPanel };
