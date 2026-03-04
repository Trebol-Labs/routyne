'use client';

import { memo, useMemo } from 'react';
import { Plus, Calendar, Dumbbell, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutView } from '@/types/workout';

interface BottomNavProps {
  currentView: WorkoutView;
  onNavigate: (view: WorkoutView) => void;
}

// Nav button configuration - single source of truth
const NAV_ITEMS: Array<{
  view: Exclude<WorkoutView, 'uploader' | 'active-session'>;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  matchViews: readonly WorkoutView[];
}> = [
  { view: 'routine-overview', icon: Dumbbell, label: 'Overview', matchViews: ['routine-overview', 'active-session'] },
  { view: 'history', icon: Calendar, label: 'History', matchViews: ['history'] },
  { view: 'stats', icon: TrendingUp, label: 'Stats', matchViews: ['stats'] },
];

const NavButton = memo(({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick 
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'w-12 h-12 rounded-lg flex items-center justify-center',
      'transition-all duration-200 cursor-pointer relative',
      'flex-1 max-w-[56px]',
      isActive
        ? 'bg-white text-black shadow-lg scale-100'
        : 'text-white/50 hover:text-white/70 hover:bg-white/8'
    )}
  >
    <Icon className="w-5 h-5" />
  </button>
));

NavButton.displayName = 'NavButton';

const FloatingAddButton = memo(({
  isActive,
  onClick,
}: {
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-label="Import routine"
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'w-12 h-12 rounded-full flex items-center justify-center',
      'transition-all duration-300 cursor-pointer shrink-0',
      'active-glass-btn relative group overflow-hidden',
      isActive
        ? 'ring-2 ring-white/50 scale-110 shadow-xl'
        : 'hover:scale-105 hover:shadow-lg'
    )}
  >
    {/* Subtle animated gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-100%] group-hover:translate-x-[100%]" />
    <Plus className="w-5 h-5 relative z-10" />
  </button>
));

FloatingAddButton.displayName = 'FloatingAddButton';

export const BottomNav = memo(({ currentView, onNavigate }: BottomNavProps) => {
  // Memoize button configs to prevent unnecessary re-renders
  const navButtons = useMemo(() => NAV_ITEMS.map(item => ({
    ...item,
    isActive: item.matchViews.includes(currentView),
  })), [currentView]);

  const fabIsActive = currentView === 'uploader';

  return (
    <>
      {/* Gradient backdrop - precisely sized to nav height */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/75 via-black/20 to-transparent z-[var(--z-nav)] pointer-events-none" />

      {/* Container for floating nav */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[var(--z-nav)] w-[calc(100%-32px)] max-w-md pb-[env(safe-area-inset-bottom)]">
        {/* Main Navigation Panel */}
        <nav
          role="navigation"
          className={cn(
            'relative flex items-center gap-2 p-2',
            'glass-panel rounded-2xl border-white/20',
            'shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]',
            'backdrop-blur-md'
          )}
        >
          {/* Background gradient animations */}
          <div className="absolute inset-0 rounded-2xl -z-20 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Floating Add Button - separated visually */}
          <div className="flex-shrink-0">
            <FloatingAddButton
              isActive={fabIsActive}
              onClick={() => onNavigate('uploader')}
            />
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-white/10 rounded-full" />

          {/* Main Navigation Buttons */}
          <div className="flex-1 flex justify-around gap-1">
            {navButtons.map(({ view, icon, label, isActive }) => (
              <NavButton
                key={view}
                icon={icon}
                label={label}
                isActive={isActive}
                onClick={() => onNavigate(view)}
              />
            ))}
          </div>
        </nav>

        {/* Tooltip hint for FAB */}
        <div className="absolute top-0 left-8 -translate-y-10 opacity-0 pointer-events-none transition-opacity duration-200 text-xs font-medium text-white/50">
          Add Routine
        </div>
      </div>
    </>
  );
});

BottomNav.displayName = 'BottomNav';
