'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Scale } from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import { StreakCalendar } from '@/components/stats/StreakCalendar';
import { PersonalRecordsTable } from '@/components/stats/PersonalRecordsTable';
import { MuscleGroupChart } from '@/components/stats/MuscleGroupChart';
import { RecoveryIndicator } from '@/components/stats/RecoveryIndicator';
import { BodyWeightSheet } from '@/components/workout/overlays/BodyWeightSheet';
import { loadBodyweightHistory } from '@/lib/db/bodyweight';
import { getMuscleGroupVolume } from '@/lib/analytics/muscle-map';
import { loadEarnedAchievements } from '@/lib/db/achievements';
import { ACHIEVEMENTS } from '@/lib/achievements/definitions';
import { cn } from '@/lib/utils';
import type { Bodyweight } from '@/types/workout';
import type { AchievementRecord } from '@/lib/db/schema';

const VolumeBarChart = dynamic(
  () => import('@/components/stats/VolumeBarChart').then((m) => ({ default: m.VolumeBarChart })),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-xl bg-white/[0.04]" /> },
);

const BodyWeightChart = dynamic(
  () => import('@/components/stats/BodyWeightChart').then((m) => ({ default: m.BodyWeightChart })),
  { ssr: false, loading: () => <div className="h-28 animate-pulse rounded-xl bg-white/[0.04]" /> },
);

// ── Level system ───────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [0, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300];
const LEVEL_NAMES = ['Novato', 'Amateur', 'Regular', 'Atleta', 'Veterano', 'Élite', 'Hierro', 'Maestro', 'Leyenda', 'Inmortal', 'Mítico'];

function computeLevel(sessions: number) {
  let idx = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (sessions >= LEVEL_THRESHOLDS[i]) idx = i;
    else break;
  }
  const isMax = idx === LEVEL_THRESHOLDS.length - 1;
  const curr = LEVEL_THRESHOLDS[idx];
  const next = LEVEL_THRESHOLDS[Math.min(idx + 1, LEVEL_THRESHOLDS.length - 1)];
  return {
    level: idx + 1,
    name: LEVEL_NAMES[idx],
    progress: isMax ? 1 : (sessions - curr) / (next - curr),
    sessionsToNext: isMax ? 0 : next - sessions,
    isMax,
  };
}

// ── Achievement categories ─────────────────────────────────────────────────────

const ACHIEVEMENT_CATEGORIES = {
  sessions: { label: 'Constancia', emoji: '🔥', colorClass: 'text-orange-400',  barClass: 'bg-orange-400'  },
  volume:   { label: 'Volumen',    emoji: '💪', colorClass: 'text-blue-400',    barClass: 'bg-blue-400'    },
  prs:      { label: 'Récords',    emoji: '🏆', colorClass: 'text-yellow-400',  barClass: 'bg-yellow-400'  },
  variety:  { label: 'Variedad',   emoji: '🎭', colorClass: 'text-purple-400',  barClass: 'bg-purple-400'  },
  streak:   { label: 'Rachas',     emoji: '⚡', colorClass: 'text-cyan-400',    barClass: 'bg-cyan-400'    },
  special:  { label: 'Especial',   emoji: '✨', colorClass: 'text-emerald-400', barClass: 'bg-emerald-400' },
} as const;

// ── Progress thresholds for chain achievements ─────────────────────────────────

function getProgressEntry(
  id: string,
  totalSessions: number,
  totalVolume: number,
  totalExercises: number,
  longestStreak: number,
): { current: number; total: number } | null {
  const map: Record<string, { current: number; total: number }> = {
    'sessions-5':        { current: totalSessions,  total: 5      },
    'sessions-10':       { current: totalSessions,  total: 10     },
    'sessions-25':       { current: totalSessions,  total: 25     },
    'sessions-50':       { current: totalSessions,  total: 50     },
    'sessions-100':      { current: totalSessions,  total: 100    },
    'sessions-365':      { current: totalSessions,  total: 365    },
    'total-volume-100k': { current: totalVolume,    total: 100000 },
    'total-volume-500k': { current: totalVolume,    total: 500000 },
    'total-volume-1m':   { current: totalVolume,    total: 1000000},
    'exercises-5':       { current: totalExercises, total: 5      },
    'exercises-15':      { current: totalExercises, total: 15     },
    'exercises-30':      { current: totalExercises, total: 30     },
    'streak-3':          { current: longestStreak,  total: 3      },
    'streak-7':          { current: longestStreak,  total: 7      },
    'streak-14':         { current: longestStreak,  total: 14     },
    'streak-30':         { current: longestStreak,  total: 30     },
  };
  return map[id] ?? null;
}

type Tab = 'overview' | 'progress' | 'trophies';

export function StatsView() {
  const { history, profile } = useWorkoutStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [volumeLimit, setVolumeLimit] = useState<7 | 30>(7);
  const [showBodyWeightSheet, setShowBodyWeightSheet] = useState(false);
  const [bodyweightEntries, setBodyweightEntries] = useState<Bodyweight[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<AchievementRecord[]>([]);

  useEffect(() => { loadBodyweightHistory(30).then(setBodyweightEntries); }, []);
  useEffect(() => { loadEarnedAchievements().then(setEarnedAchievements); }, []);

  const refreshBodyweight = () => loadBodyweightHistory(30).then(setBodyweightEntries);

  const muscleData = useMemo(() => getMuscleGroupVolume(history, 7), [history]);

  const totalSessions = history.length;

  const totalVolume = useMemo(
    () => history.reduce((sum, e) => sum + e.totalVolume, 0),
    [history],
  );

  const totalExercises = useMemo(() => {
    const names = new Set<string>();
    for (const e of history)
      for (const v of e.volumeData)
        names.add(v.cleanName.toLowerCase());
    return names.size;
  }, [history]);

  const longestStreak = useMemo(() => {
    if (history.length === 0) return 0;
    const days = [...new Set(
      history.map((e) => {
        const d = e.completedAt instanceof Date ? e.completedAt : new Date(e.completedAt);
        return d.toISOString().split('T')[0];
      }),
    )].sort();
    if (days.length === 0) return 0;
    let longest = 1, current = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000;
      if (diff === 1) { current++; longest = Math.max(longest, current); }
      else current = 1;
    }
    return longest;
  }, [history]);

  const levelInfo = useMemo(() => computeLevel(totalSessions), [totalSessions]);
  const earnedIds = useMemo(() => new Set(earnedAchievements.map((a) => a.id)), [earnedAchievements]);

  const volumeDisplay = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(totalVolume >= 10000 ? 0 : 1)}k${profile.weightUnit}`
    : totalVolume > 0
      ? `${Math.round(totalVolume)}${profile.weightUnit}`
      : '—';

  const sectionLabel = 'text-[10px] font-black text-white/40 uppercase tracking-[0.4em]';

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',  label: 'Resumen' },
    { id: 'progress',  label: 'Progreso' },
    { id: 'trophies',  label: 'Trofeos' },
  ];

  return (
    <>
      <motion.div
        key="stats"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="space-y-4 px-4 pb-6"
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
          <div>
            <h3 className="text-white font-black text-2xl sm:text-3xl tracking-tighter uppercase font-display leading-none">Estadísticas</h3>
            {history.length > 0 && (
              <p className="text-[9px] font-black text-white/35 uppercase tracking-[0.3em] mt-0.5">
                Lv.{levelInfo.level} · {levelInfo.name}
              </p>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          /* ── Empty state ── */
          <div className="glass-panel rounded-[var(--radius-xl)] border-white/5 px-6 py-10 text-center space-y-4">
            <TrendingUp className="w-14 h-14 text-white/5 mx-auto" />
            <div>
              <p className="text-white/40 font-black text-lg uppercase tracking-tighter">Tus estadísticas aparecerán aquí</p>
              <p className="text-white/25 text-[11px] font-black uppercase tracking-[0.3em] mt-1">Completa una sesión para empezar a registrar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sesiones',  value: totalSessions.toLocaleString(), color: 'text-blue-400'    },
                { label: 'Volumen',    value: volumeDisplay,                  color: 'text-indigo-400'  },
                { label: 'Ejercicios', value: totalExercises.toLocaleString(), color: 'text-emerald-400' },
              ].map((card) => (
                <div key={card.label} className="glass-panel rounded-[var(--radius-lg)] p-3 sm:p-4 border-white/5 text-center space-y-1">
                  <p className={`text-xl sm:text-2xl font-black tracking-tighter font-display truncate ${card.color}`}>{card.value}</p>
                  <p className="text-[8px] sm:text-[10px] font-black text-white/35 uppercase tracking-widest">{card.label}</p>
                </div>
              ))}
            </div>

            {/* ── Level / XP bar ── */}
            <div className="glass-panel rounded-[var(--radius-lg)] px-4 py-3 border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white font-display uppercase tracking-tight">
                    Lv.{levelInfo.level}
                  </span>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">
                    {levelInfo.name}
                  </span>
                </div>
                {!levelInfo.isMax ? (
                  <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">
                    {levelInfo.sessionsToNext} para Lv.{levelInfo.level + 1}
                </span>
              ) : (
                  <span className="text-[9px] font-black text-amber-400/60 uppercase tracking-widest">Nivel máximo</span>
              )}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(levelInfo.progress * 100)}%` }}
                  transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            </div>

            {/* ── Tab navigation ── */}
            <div className="sunken-glass rounded-[1.5rem] p-1 flex gap-0.5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'relative flex-1 py-2 px-1 rounded-[1.2rem] text-[11px] font-black uppercase tracking-wider transition-colors duration-200',
                      isActive ? 'text-white' : 'text-white/40 hover:text-white/60',
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="stats-tab-bg"
                        className="absolute inset-0 active-glass-btn rounded-[1.2rem]"
                        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ── Tab content ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-4"
              >

                {/* ══════════════ OVERVIEW ══════════════ */}
                {activeTab === 'overview' && (
                  <>
                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-3">
                      <p className={sectionLabel}>Actividad</p>
                      <StreakCalendar
                        history={history}
                        restDays={profile.restDays ?? []}
                        weekStartsOn={profile.preferences.weekStartsOn}
                      />
                    </div>

                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className={sectionLabel}>Peso corporal</p>
                        <button
                          onClick={() => setShowBodyWeightSheet(true)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 hover:bg-white/[0.07] hover:text-white/70 transition-colors"
                        >
                          <Scale className="w-3 h-3" />
                          Registrar
                        </button>
                      </div>
                      <BodyWeightChart entries={bodyweightEntries} unit={profile.weightUnit} />
                    </div>

                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-3">
                      <p className={sectionLabel}>Sesiones recientes</p>
                      {history.slice(0, 5).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-[var(--radius-md)] bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white/70 uppercase tracking-tighter truncate">{entry.sessionTitle}</p>
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em] mt-0.5">
                              {entry.volumeData.length} ejercicios
                            </p>
                          </div>
                          <span className={cn(
                            'text-[9px] font-black uppercase tracking-widest shrink-0 whitespace-nowrap',
                            entry.totalVolume > 0 ? 'text-blue-400/60' : 'text-white/35',
                          )}>
                            {entry.totalVolume > 0
                              ? `${entry.totalVolume.toLocaleString()}${profile.weightUnit}`
                              : 'BW'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ══════════════ PROGRESS ══════════════ */}
                {activeTab === 'progress' && (
                  <>
                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className={sectionLabel}>Volumen</p>
                        <ToggleGroup
                          options={['7d', '30d']}
                          value={`${volumeLimit}d`}
                          onChange={(v) => setVolumeLimit(v === '7d' ? 7 : 30)}
                          ariaLabel="Rango del gráfico"
                        />
                      </div>
                      <VolumeBarChart history={history} limit={volumeLimit} weightUnit={profile.weightUnit} />
                    </div>

                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-4">
                      <p className={sectionLabel}>Récords personales</p>
                      <PersonalRecordsTable history={history} weightUnit={profile.weightUnit} />
                    </div>

                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className={sectionLabel}>Volumen muscular semanal</p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/25">Últimos 7 días</span>
                      </div>
                      <MuscleGroupChart data={muscleData} />
                    </div>

                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-4">
                      <p className={sectionLabel}>Estado de recuperación</p>
                      <RecoveryIndicator data={muscleData} />
                    </div>
                  </>
                )}

                {/* ══════════════ TROPHIES ══════════════ */}
                {activeTab === 'trophies' && (
                  <>
                    {/* Overall progress */}
                    <div className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className={sectionLabel}>Colección</p>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          {earnedAchievements.length} / {ACHIEVEMENTS.length}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${(earnedAchievements.length / ACHIEVEMENTS.length) * 100}%` }}
                          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
                        />
                      </div>
                      <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em]">
                        {ACHIEVEMENTS.length - earnedAchievements.length} restantes
                      </p>
                    </div>

                    {/* Category groups */}
                    {(
                      Object.entries(ACHIEVEMENT_CATEGORIES) as [
                        keyof typeof ACHIEVEMENT_CATEGORIES,
                        typeof ACHIEVEMENT_CATEGORIES[keyof typeof ACHIEVEMENT_CATEGORIES],
                      ][]
                    ).map(([catKey, catMeta]) => {
                      const catList = ACHIEVEMENTS.filter((a) => a.category === catKey);
                      const catEarned = catList.filter((a) => earnedIds.has(a.id)).length;
                      return (
                        <div key={catKey} className="glass-panel rounded-[var(--radius-lg)] p-5 border-white/5 space-y-3">
                          {/* Category header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base leading-none">{catMeta.emoji}</span>
                              <p className={cn('text-[10px] font-black uppercase tracking-[0.35em]', catMeta.colorClass)}>
                                {catMeta.label}
                              </p>
                            </div>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                              {catEarned} / {catList.length}
                            </span>
                          </div>

                          {/* Achievement rows */}
                          <div className="space-y-2">
                            {catList.map((def) => {
                              const earned = earnedIds.has(def.id);
                              const prog = getProgressEntry(def.id, totalSessions, totalVolume, totalExercises, longestStreak);
                              const progPct = prog ? Math.min(prog.current / prog.total, 1) : null;

                              return (
                                <div
                                  key={def.id}
                                  className={cn(
                                    'rounded-xl p-3 transition-all',
                                    earned
                                      ? 'bg-white/[0.05] border border-white/[0.09]'
                                      : 'bg-white/[0.02] border border-white/[0.04]',
                                  )}
                                >
                                  <div className="flex items-start gap-3">
                                    <span
                                      className="text-xl leading-none shrink-0 mt-0.5"
                                      style={{ filter: earned ? 'none' : 'grayscale(1) opacity(0.25)' }}
                                    >
                                      {def.emoji}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        'text-xs font-black uppercase tracking-tight leading-none',
                                        earned ? 'text-white/80' : 'text-white/30',
                                      )}>
                                        {def.name}
                                      </p>
                                      <p className={cn(
                                        'text-[9px] font-black uppercase tracking-[0.18em] mt-0.5',
                                        earned ? 'text-white/35' : 'text-white/18',
                                      )}>
                                        {def.description}
                                      </p>

                                      {/* Progress bar for chain achievements (only when not yet earned) */}
                                      {!earned && progPct !== null && progPct > 0 && (
                                        <div className="mt-2 space-y-0.5">
                                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                                            <motion.div
                                              className={cn('h-full rounded-full opacity-60', catMeta.barClass)}
                                              initial={{ width: 0 }}
                                              animate={{ width: `${Math.round(progPct * 100)}%` }}
                                              transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
                                            />
                                          </div>
                                          {prog && (
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                                              {prog.current.toLocaleString()} / {prog.total.toLocaleString()}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Earned checkmark */}
                                    {earned && (
                                      <div className={cn(
                                        'shrink-0 w-4 h-4 rounded-full flex items-center justify-center opacity-70',
                                        catMeta.barClass,
                                      )}>
                                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

              </motion.div>
            </AnimatePresence>

          </div>
        )}
      </motion.div>

      {showBodyWeightSheet && (
        <BodyWeightSheet
          onClose={() => setShowBodyWeightSheet(false)}
          onSaved={refreshBodyweight}
        />
      )}
    </>
  );
}
