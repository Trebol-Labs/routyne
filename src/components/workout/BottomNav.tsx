'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Dumbbell, TrendingUp, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutView } from '@/types/workout';

interface BottomNavProps {
  currentView: WorkoutView;
  onNavigate: (view: WorkoutView) => void;
  hasRoutine: boolean;
}

const NavButton = memo(({ 
  icon: Icon, 
  label, 
  isActive, 
  isPrimary,
  onClick 
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  isPrimary?: boolean;
  onClick: () => void;
}) => (
  <motion.button
    layout
    onClick={onClick}
    aria-label={label}
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      'w-11 h-11 rounded-lg flex items-center justify-center',
      'transition-all duration-300 cursor-pointer relative',
      isPrimary
        ? cn(
            'active-glass-btn group overflow-hidden',
            isActive
              ? 'ring-2 ring-white/40 scale-100 shadow-[0_0_25px_-5px_rgba(59,130,246,0.5)]'
              : 'hover:scale-95 hover:shadow-md'
          )
        : isActive
          ? 'bg-white text-black shadow-[0_6px_15px_-4px_rgba(255,255,255,0.25)] scale-100'
          : 'text-white/40 hover:text-white/60 hover:bg-white/5'
    )}
  >
    {isPrimary && (
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" />
    )}
    <Icon className={cn("w-5 h-5 transition-transform duration-300 relative z-10", isActive && isPrimary && "rotate-45", isActive && !isPrimary && "scale-105")} />
    {isActive && !isPrimary && (
      <motion.div
        layoutId="active-pill"
        className="absolute -bottom-1 w-1 h-1 bg-black rounded-full"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
  </motion.button>
));

NavButton.displayName = 'NavButton';

export const BottomNav = memo(({ currentView, onNavigate, hasRoutine }: BottomNavProps) => {
  const navItems = useMemo(() => {
    const baseItems = [
      { id: 'overview', view: 'routine-overview' as WorkoutView, icon: Dumbbell, label: 'Overview', matchViews: ['routine-overview', 'active-session'], isPrimary: false },
      { id: 'history', view: 'history' as WorkoutView, icon: Calendar, label: 'History', matchViews: ['history'], isPrimary: false },
      { id: 'stats', view: 'stats' as WorkoutView, icon: TrendingUp, label: 'Stats', matchViews: ['stats'], isPrimary: false },
    ];

    const importItem = {
      id: 'uploader',
      view: 'uploader' as WorkoutView,
      icon: hasRoutine ? Library : Plus,
      label: hasRoutine ? 'Routines' : 'Add Routine',
      matchViews: ['uploader'],
      isPrimary: !hasRoutine,
    };

    // If there's a routine, put the import item at the end (far right).
    // If there's no routine, put it at the beginning (far left) as the primary action.
    return hasRoutine ? [...baseItems, importItem] : [importItem, ...baseItems];
  }, [hasRoutine]);

  return (
    <>
      {/* Gradient backdrop - precisely sized to nav height */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-[var(--z-nav)] pointer-events-none" />

      {/* Container for floating nav */}
      <div
        className="fixed bottom-0 inset-x-0 z-[var(--z-nav)] flex justify-center px-3 sm:px-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 18px)' }}
      >
        {/* Main Navigation Panel */}
        <nav
          role="navigation"
          className={cn(
            'relative flex items-center justify-between gap-1.5 p-2',
            'w-full max-w-xs',
            'glass-panel rounded-[20px] border-white/10',
            'shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)]',
            'backdrop-blur-2xl'
          )}
        >
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-[24px] border border-white/5 pointer-events-none" />

          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={item.matchViews.includes(currentView)}
              isPrimary={item.isPrimary}
              onClick={() => onNavigate(item.view)}
            />
          ))}
        </nav>
      </div>
    </>
  );
});

BottomNav.displayName = 'BottomNav';
