import type { AchievementDefinition } from '@/types/workout';
import type { HistoryEntry, WorkoutSummary } from '@/types/workout';

export interface AchievementContext {
  history: HistoryEntry[];      // full history (new entry is history[0])
  summary: WorkoutSummary;
  earnedIds: Set<string>;
}

export interface CheckableAchievement extends AchievementDefinition {
  check: (ctx: AchievementContext) => boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionCount(history: HistoryEntry[]): number {
  return history.length;
}

function totalVolume(history: HistoryEntry[]): number {
  return history.reduce((s, e) => s + e.totalVolume, 0);
}

function uniqueExercises(history: HistoryEntry[]): number {
  const names = new Set<string>();
  for (const e of history) {
    for (const v of e.volumeData) names.add(v.cleanName.toLowerCase());
  }
  return names.size;
}

function maxSingleSessionVolume(history: HistoryEntry[]): number {
  return history.reduce((max, e) => Math.max(max, e.totalVolume), 0);
}

/** Returns the longest consecutive-day streak (checking completedAt dates) */
function longestStreak(history: HistoryEntry[]): number {
  if (history.length === 0) return 0;
  const days = [...new Set(
    history.map((e) => {
      const d = e.completedAt instanceof Date ? e.completedAt : new Date(e.completedAt);
      return d.toISOString().split('T')[0];
    })
  )].sort();

  let longest = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function completionPercent(summary: WorkoutSummary): number {
  if (summary.totalSets === 0) return 0;
  const completedSets = summary.entry.volumeData.reduce((s, v) => s + v.setsCompleted, 0);
  return (completedSets / summary.totalSets) * 100;
}

// ── Definitions ───────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: CheckableAchievement[] = [
  // ── Sessions ──────────────────────────────────────────────────────────────
  {
    id: 'first-session',
    name: 'First Rep',
    description: 'Complete your first workout session',
    emoji: '🏋️',
    category: 'sessions',
    check: ({ history }) => sessionCount(history) >= 1,
  },
  {
    id: 'sessions-5',
    name: 'Iron Rookie',
    description: 'Complete 5 workout sessions',
    emoji: '💪',
    category: 'sessions',
    check: ({ history }) => sessionCount(history) >= 5,
  },
  {
    id: 'sessions-10',
    name: 'Consistent',
    description: 'Complete 10 workout sessions',
    emoji: '🔥',
    category: 'sessions',
    check: ({ history }) => sessionCount(history) >= 10,
  },
  {
    id: 'sessions-25',
    name: 'Dedicated',
    description: 'Complete 25 workout sessions',
    emoji: '⚡',
    category: 'sessions',
    check: ({ history }) => sessionCount(history) >= 25,
  },
  {
    id: 'sessions-50',
    name: 'Iron Athlete',
    description: 'Complete 50 workout sessions',
    emoji: '🏅',
    category: 'sessions',
    check: ({ history }) => sessionCount(history) >= 50,
  },
  {
    id: 'sessions-100',
    name: 'Century',
    description: 'Complete 100 workout sessions',
    emoji: '💯',
    category: 'sessions',
    check: ({ history }) => sessionCount(history) >= 100,
  },
  {
    id: 'sessions-365',
    name: 'Legend',
    description: 'Complete 365 workout sessions',
    emoji: '👑',
    category: 'sessions',
    check: ({ history }) => sessionCount(history) >= 365,
  },
  // ── Volume ────────────────────────────────────────────────────────────────
  {
    id: 'session-volume-1000',
    name: 'Big Lift',
    description: 'Log 1,000+ in a single session',
    emoji: '💥',
    category: 'volume',
    check: ({ summary }) => summary.entry.totalVolume >= 1000,
  },
  {
    id: 'session-volume-5000',
    name: 'Volume Day',
    description: 'Log 5,000+ in a single session',
    emoji: '🏔️',
    category: 'volume',
    check: ({ summary }) => summary.entry.totalVolume >= 5000,
  },
  {
    id: 'session-volume-10000',
    name: 'Tonnage Beast',
    description: 'Log 10,000+ in a single session',
    emoji: '🦁',
    category: 'volume',
    check: ({ summary }) => summary.entry.totalVolume >= 10000,
  },
  {
    id: 'total-volume-100k',
    name: 'Volume King',
    description: '100,000 total volume logged',
    emoji: '🌋',
    category: 'volume',
    check: ({ history }) => totalVolume(history) >= 100000,
  },
  {
    id: 'total-volume-500k',
    name: 'Tonnage Pro',
    description: '500,000 total volume logged',
    emoji: '⭐',
    category: 'volume',
    check: ({ history }) => totalVolume(history) >= 500000,
  },
  {
    id: 'total-volume-1m',
    name: 'Million Club',
    description: '1,000,000 total volume logged',
    emoji: '💎',
    category: 'volume',
    check: ({ history }) => totalVolume(history) >= 1000000,
  },
  // ── Personal Records ──────────────────────────────────────────────────────
  {
    id: 'first-pr',
    name: 'First PR',
    description: 'Set your first personal record',
    emoji: '🏆',
    category: 'prs',
    check: ({ summary }) => summary.newPRs.length > 0,
  },
  {
    id: 'pr-triple',
    name: 'Hat Trick',
    description: 'Set 3 PRs in a single session',
    emoji: '🎯',
    category: 'prs',
    check: ({ summary }) => summary.newPRs.length >= 3,
  },
  {
    id: 'pr-five',
    name: 'Record Spree',
    description: 'Set 5 PRs in a single session',
    emoji: '🎆',
    category: 'prs',
    check: ({ summary }) => summary.newPRs.length >= 5,
  },
  // ── Variety ───────────────────────────────────────────────────────────────
  {
    id: 'exercises-5',
    name: 'Getting Started',
    description: 'Log 5 unique exercises',
    emoji: '📚',
    category: 'variety',
    check: ({ history }) => uniqueExercises(history) >= 5,
  },
  {
    id: 'exercises-15',
    name: 'Well-Rounded',
    description: 'Log 15 unique exercises',
    emoji: '🎭',
    category: 'variety',
    check: ({ history }) => uniqueExercises(history) >= 15,
  },
  {
    id: 'exercises-30',
    name: 'Exercise Encyclopedia',
    description: 'Log 30 unique exercises',
    emoji: '🧠',
    category: 'variety',
    check: ({ history }) => uniqueExercises(history) >= 30,
  },
  // ── Streak ────────────────────────────────────────────────────────────────
  {
    id: 'streak-3',
    name: 'On a Roll',
    description: '3 consecutive training days',
    emoji: '🔗',
    category: 'streak',
    check: ({ history }) => longestStreak(history) >= 3,
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: '7 consecutive training days',
    emoji: '📅',
    category: 'streak',
    check: ({ history }) => longestStreak(history) >= 7,
  },
  {
    id: 'streak-14',
    name: 'Fortnight Grind',
    description: '14 consecutive training days',
    emoji: '🌙',
    category: 'streak',
    check: ({ history }) => longestStreak(history) >= 14,
  },
  {
    id: 'streak-30',
    name: 'Monthly Madness',
    description: '30 consecutive training days',
    emoji: '🌟',
    category: 'streak',
    check: ({ history }) => longestStreak(history) >= 30,
  },
  // ── Special ───────────────────────────────────────────────────────────────
  {
    id: 'perfect-session',
    name: 'Perfect Session',
    description: 'Complete 100% of sets in a session',
    emoji: '✅',
    category: 'special',
    check: ({ summary }) => summary.totalSets > 0 && completionPercent(summary) >= 100,
  },
  {
    id: 'marathon-session',
    name: 'Marathon',
    description: 'Complete a workout lasting 90+ minutes',
    emoji: '⏱️',
    category: 'special',
    check: ({ summary }) => (summary.durationSeconds ?? 0) >= 5400,
  },
  {
    id: 'volume-improvement',
    name: 'Progressive Overload',
    description: 'Beat last session volume by 20%+',
    emoji: '📈',
    category: 'special',
    check: ({ summary }) => (summary.volumeDeltaPercent ?? 0) >= 20,
  },
  {
    id: 'max-single-volume',
    name: 'Personal Best Day',
    description: 'Set a new all-time single-session volume record',
    emoji: '🌅',
    category: 'special',
    check: ({ history, summary }) => {
      const prev = history.slice(1);
      if (prev.length === 0) return false;
      return summary.entry.totalVolume > maxSingleSessionVolume(prev);
    },
  },
  {
    id: 'comeback',
    name: 'Comeback',
    description: 'Return to training after 14+ days off',
    emoji: '🔄',
    category: 'special',
    check: ({ history }) => {
      if (history.length < 2) return false;
      const latest = history[0].completedAt instanceof Date ? history[0].completedAt : new Date(history[0].completedAt);
      const prev = history[1].completedAt instanceof Date ? history[1].completedAt : new Date(history[1].completedAt);
      return (latest.getTime() - prev.getTime()) / 86_400_000 >= 14;
    },
  },
  {
    id: 'sets-20',
    name: 'Volume Day',
    description: 'Complete 20+ sets in a single session',
    emoji: '🏗️',
    category: 'special',
    check: ({ summary }) => summary.totalSets >= 20,
  },
];
