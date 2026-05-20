import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { translations } from '@/lib/i18n/translations';
import type { UserProfile } from '@/types/workout';

const mocks = vi.hoisted(() => ({
  useHydration: vi.fn(),
  useWorkoutStore: vi.fn(),
  useAuth: vi.fn(),
  useSync: vi.fn(),
  useStoragePersist: vi.fn(),
  useNativeDeepLinks: vi.fn(),
  useStreakReminderSync: vi.fn(),
  useOnboardingGate: vi.fn(),
  useI18n: vi.fn(),
  routerReplace: vi.fn(),
}));

let mockStoreState: Record<string, unknown>;

vi.mock('@/hooks/useHydration', () => ({
  useHydration: () => mocks.useHydration(),
}));

vi.mock('@/store/useWorkoutStore', () => ({
  useWorkoutStore: (selector?: (state: typeof mockStoreState) => unknown) =>
    (selector ? selector(mockStoreState) : mockStoreState),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/hooks/useSync', () => ({
  useSync: (...args: unknown[]) => mocks.useSync(...args),
}));

vi.mock('@/hooks/useStoragePersist', () => ({
  useStoragePersist: () => mocks.useStoragePersist(),
}));

vi.mock('@/hooks/useNativeDeepLinks', () => ({
  useNativeDeepLinks: () => mocks.useNativeDeepLinks(),
}));

vi.mock('@/hooks/useStreakReminderSync', () => ({
  useStreakReminderSync: (...args: unknown[]) => mocks.useStreakReminderSync(...args),
}));

vi.mock('@/hooks/useOnboardingGate', () => ({
  useOnboardingGate: (...args: unknown[]) => mocks.useOnboardingGate(...args),
}));

vi.mock('@/components/i18n/LanguageProvider', () => ({
  useI18n: () => mocks.useI18n(),
}));

vi.mock('@/components/workout/ShellSkeleton', () => ({
  ShellSkeleton: () => <div data-testid="shell-skeleton" />,
}));

vi.mock('@/components/workout/RoutineUploader', () => ({
  RoutineUploader: () => <div data-testid="routine-uploader" />,
}));

vi.mock('@/components/workout/TopHeader', () => ({
  TopHeader: () => <div data-testid="top-header" />,
}));

vi.mock('@/components/workout/BottomNav', () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

vi.mock('@/components/workout/RestTimer', () => ({
  RestTimer: () => mockStoreState.restTimer ? <div data-testid="rest-timer" /> : null,
}));

vi.mock('@/components/workout/views/HistoryView', () => ({
  HistoryView: () => <div data-testid="history-view" />,
}));

vi.mock('@/components/workout/overlays/AccountSheet', () => ({
  AccountSheet: () => <div data-testid="account-sheet" />,
}));

vi.mock('@/components/workout/overlays/CoachSheet', () => ({
  CoachSheet: () => <div data-testid="coach-sheet" />,
}));

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ replace: mocks.routerReplace }),
  useSearchParams: () => new URLSearchParams(''),
}));

function makeProfile(): UserProfile {
  return {
    displayName: 'Sierra',
    avatarEmoji: '🏋️',
    weightUnit: 'kg',
    heightCm: 165,
    defaultRestSeconds: 90,
    restDays: [],
    preferences: {
      trainingGoal: 'strength',
      experienceLevel: 'beginner',
      weekStartsOn: 1,
      effortTracking: 'both',
      coachTone: 'supportive',
      accentColor: 'blue',
      uiDensity: 'comfortable',
      motionLevel: 'system',
      reducedMotion: false,
      language: 'es',
      streakReminderEnabled: true,
      streakReminderTime: '20:00',
      timerNotificationsEnabled: true,
      timezone: 'UTC',
    },
    updatedAt: '2026-05-11T12:00:00.000Z',
  };
}

describe('startup shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      currentRoutine: null,
      currentView: 'uploader',
      setCurrentView: vi.fn(),
      resetAll: vi.fn(),
      pendingAchievements: [],
      clearPendingAchievements: vi.fn(),
      profile: makeProfile(),
      history: [],
      restTimer: null,
    };
    mocks.useHydration.mockReturnValue(true);
    mocks.useAuth.mockReturnValue({ user: null, isLoading: false });
    mocks.useSync.mockImplementation(() => undefined);
    mocks.useStoragePersist.mockImplementation(() => undefined);
    mocks.useNativeDeepLinks.mockImplementation(() => undefined);
    mocks.useStreakReminderSync.mockImplementation(() => undefined);
    mocks.useOnboardingGate.mockImplementation(() => undefined);
    mocks.useI18n.mockReturnValue({
      language: 'es',
      setLanguage: vi.fn(),
      t: translations.es,
    });
  });

  it('shows the shell skeleton for returning users while hydration is pending', async () => {
    localStorage.setItem('routyne-has-local-data', '1');
    mocks.useHydration.mockReturnValue(false);

    const { default: Home } = await import('./page');
    render(<Home />);

    expect(await screen.findByTestId('shell-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('routine-uploader')).toBeNull();
  });

  it('lands on the uploader after hydration for new users without local data', async () => {
    localStorage.removeItem('routyne-has-local-data');
    mocks.useHydration.mockReturnValue(true);

    const { default: Home } = await import('./page');
    render(<Home />);

    expect(screen.getByTestId('routine-uploader')).toBeInTheDocument();
    expect(screen.queryByTestId('shell-skeleton')).toBeNull();
  });

  it('keeps the rest timer mounted outside the active session view', async () => {
    localStorage.removeItem('routyne-has-local-data');
    mockStoreState = {
      ...mockStoreState,
      currentView: 'history',
      restTimer: {
        id: 'timer-1',
        durationSeconds: 90,
        targetAt: new Date(Date.now() + 30_000),
        remainingMs: 30_000,
        status: 'running',
      },
    };

    const { default: Home } = await import('./page');
    render(<Home />);

    expect(screen.getByTestId('history-view')).toBeInTheDocument();
    expect(screen.getByTestId('rest-timer')).toBeInTheDocument();
  });
});
