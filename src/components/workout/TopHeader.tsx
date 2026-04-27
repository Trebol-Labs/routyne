'use client';

import { memo } from 'react';
import { User, Dumbbell, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccountSheetSection } from '@/components/workout/overlays/AccountSheet';

interface TopHeaderProps {
  onAccountClick: (section: AccountSheetSection) => void;
}

const BrandLogo = memo(() => (
  <div className="relative group">
    <div className="absolute inset-0 bg-blue-600 blur-[var(--blur-lg)] opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
    <div className="relative w-11 h-11 rounded-[1rem] bg-gradient-to-tr from-white/20 to-white/5 p-px backdrop-blur-3xl shadow-lg">
      <div className="w-full h-full rounded-[0.875rem] bg-black/40 flex items-center justify-center border border-white/5">
        <Dumbbell className="text-white w-6 h-6" />
      </div>
    </div>
  </div>
));

BrandLogo.displayName = 'BrandLogo';

const BrandInfo = memo(() => (
  <div className="min-w-0 flex-1 flex flex-col">
    <h1 className="sr-only">Routyne · entrenamiento y progreso</h1>
    <span
      className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-white font-display"
      aria-hidden="true"
    >
      ROUTYNE
    </span>
    <p className="mt-1 max-w-[7rem] text-[10px] font-semibold uppercase tracking-[0.22em] leading-tight whitespace-normal text-white/42 sm:max-w-[12rem] sm:text-[11px] sm:tracking-[0.24em]">
      Lift. Log. Progress.
    </p>
  </div>
));

BrandInfo.displayName = 'BrandInfo';

const ActionButton = memo(({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={cn(
      'w-11 h-11 rounded-full flex items-center justify-center',
      'transition-all duration-300 cursor-pointer',
      'active-glass-btn relative group overflow-hidden',
      'hover:scale-105 hover:shadow-md'
    )}
  >
    {/* Subtle animated gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-100%] group-hover:translate-x-[100%]" />
    <Icon className="w-4.5 h-4.5 relative z-10" />
  </button>
));

ActionButton.displayName = 'ActionButton';

export const TopHeader = memo(({
  onAccountClick,
}: TopHeaderProps) => {
  return (
    <>
      {/* Gradient backdrop - precisely sized to header height */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/75 via-black/20 to-transparent z-[calc(var(--z-header)-1)] pointer-events-none" />

      {/* Header Container */}
      <div className="sticky top-3 z-[var(--z-header)] w-full flex justify-center pointer-events-none mb-2">
        <header
          className={cn(
            'pointer-events-auto w-full px-4 sm:px-5 py-3 flex items-start justify-between gap-3',
            'glass-panel rounded-2xl border-white/20',
            'shadow-[0_15px_40px_-12px_rgba(0,0,0,0.7)]',
            'backdrop-blur-md'
          )}
        >
          {/* Background gradient animations */}
          <div className="absolute inset-0 rounded-2xl -z-20 bg-gradient-to-b from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

          {/* Brand Section */}
          <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
            <BrandLogo />
            <BrandInfo />
          </div>

          {/* Action Buttons */}
          <nav className="flex items-center gap-1.5">
            <ActionButton
              icon={Cloud}
              label="Abrir sincronización"
              onClick={() => onAccountClick('sync')}
            />
            <ActionButton
              icon={User}
              label="Abrir cuenta"
              onClick={() => onAccountClick('profile')}
            />
          </nav>
        </header>
      </div>
    </>
  );
});

TopHeader.displayName = 'TopHeader';
