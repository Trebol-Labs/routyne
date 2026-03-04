'use client';

import { memo } from 'react';
import { Search, User, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  onSearchClick: () => void;
  onProfileClick: () => void;
}

const BrandLogo = memo(() => (
  <div className="relative group">
    <div className="absolute inset-0 bg-blue-600 blur-[var(--blur-lg)] opacity-40 group-hover:opacity-80 transition-opacity duration-300" />
    <div className="relative w-12 h-12 rounded-[var(--radius-md)] bg-gradient-to-tr from-white/20 to-white/5 p-px backdrop-blur-3xl shadow-2xl">
      <div className="w-full h-full rounded-[var(--radius-sm)] bg-black/40 flex items-center justify-center border border-white/5">
        <Dumbbell className="text-white w-7 h-7" />
      </div>
    </div>
  </div>
));

BrandLogo.displayName = 'BrandLogo';

const BrandInfo = memo(() => (
  <div className="flex flex-col">
    <h1 className="sr-only">Routyne Workout Tracker</h1>
    <span className="text-2xl font-black tracking-tighter leading-none text-white font-display" aria-hidden="true">
      ROUTYNE
    </span>
    <div className="flex items-center gap-2 mt-1.5 pl-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.3em] whitespace-nowrap">
        OFFLINE READY
      </p>
    </div>
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
      'hover:scale-110 hover:shadow-lg'
    )}
  >
    {/* Subtle animated gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-100%] group-hover:translate-x-[100%]" />
    <Icon className="w-5 h-5 relative z-10" />
  </button>
));

ActionButton.displayName = 'ActionButton';

export const TopHeader = memo(({ onSearchClick, onProfileClick }: TopHeaderProps) => {
  return (
    <>
      {/* Gradient backdrop - precisely sized to header height */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/75 via-black/20 to-transparent z-[calc(var(--z-header)-1)] pointer-events-none" />

      {/* Header Container */}
      <div className="sticky top-4 z-[var(--z-header)] w-full flex justify-center pointer-events-none mb-4">
        <header
          className={cn(
            'pointer-events-auto w-full px-6 py-4 flex items-center justify-between',
            'glass-panel rounded-2xl border-white/20',
            'shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]',
            'backdrop-blur-md'
          )}
        >
          {/* Background gradient animations */}
          <div className="absolute inset-0 rounded-2xl -z-20 bg-gradient-to-b from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

          {/* Brand Section */}
          <div className="flex items-center gap-5">
            <BrandLogo />
            <BrandInfo />
          </div>

          {/* Action Buttons */}
          <nav className="flex items-center gap-2">
            <ActionButton
              icon={Search}
              label="Search exercises"
              onClick={onSearchClick}
            />
            <ActionButton
              icon={User}
              label="Profile settings"
              onClick={onProfileClick}
            />
          </nav>
        </header>
      </div>
    </>
  );
});

TopHeader.displayName = 'TopHeader';
