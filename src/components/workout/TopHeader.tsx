'use client';

import { memo } from 'react';
import { User, Dumbbell, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface TopHeaderProps {
  onProfileClick: () => void;
  onCloudClick?: () => void;
  syncStatus?: SyncStatus;
  pendingCount?: number;
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
  <div className="flex flex-col">
    <h1 className="sr-only">Routyne Workout Tracker</h1>
    <span className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-white font-display" aria-hidden="true">
      ROUTYNE
    </span>
    <div className="flex items-center gap-1.5 mt-1 pl-px">
      <span className="w-1 h-1 rounded-full bg-blue-500" />
      <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.25em] whitespace-nowrap">
        OFFLINE
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
      'hover:scale-105 hover:shadow-md'
    )}
  >
    {/* Subtle animated gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-100%] group-hover:translate-x-[100%]" />
    <Icon className="w-4.5 h-4.5 relative z-10" />
  </button>
));

ActionButton.displayName = 'ActionButton';

function CloudSyncIcon({ status }: { status: SyncStatus }) {
  if (status === 'syncing') return <Loader2 className="w-4.5 h-4.5 relative z-10 animate-spin text-sky-400" />;
  if (status === 'offline') return <CloudOff className="w-4.5 h-4.5 relative z-10 text-amber-400" />;
  if (status === 'error') return <Cloud className="w-4.5 h-4.5 relative z-10 text-red-400" />;
  if (status === 'synced') return <Cloud className="w-4.5 h-4.5 relative z-10 text-emerald-400" />;
  return <Cloud className="w-4.5 h-4.5 relative z-10 text-white/40" />;
}

export const TopHeader = memo(({
  onProfileClick,
  onCloudClick,
  syncStatus = 'idle',
  pendingCount = 0,
}: TopHeaderProps) => {
  return (
    <>
      {/* Gradient backdrop - precisely sized to header height */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/75 via-black/20 to-transparent z-[calc(var(--z-header)-1)] pointer-events-none" />

      {/* Header Container */}
      <div className="sticky top-3 z-[var(--z-header)] w-full flex justify-center pointer-events-none mb-2">
        <header
          className={cn(
            'pointer-events-auto w-full px-4 sm:px-5 py-3 flex items-center justify-between',
            'glass-panel rounded-2xl border-white/20',
            'shadow-[0_15px_40px_-12px_rgba(0,0,0,0.7)]',
            'backdrop-blur-md'
          )}
        >
          {/* Background gradient animations */}
          <div className="absolute inset-0 rounded-2xl -z-20 bg-gradient-to-b from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

           {/* Brand Section */}
           <div className="flex items-center gap-2.5">
             <BrandLogo />
             <BrandInfo />
           </div>

           {/* Action Buttons */}
           <nav className="flex items-center gap-1.5">
            {onCloudClick && (
              <button
                onClick={onCloudClick}
                aria-label="Cloud sync"
                className={cn(
                  'relative w-11 h-11 rounded-full flex items-center justify-center',
                  'transition-all duration-300 cursor-pointer active-glass-btn group overflow-hidden',
                  'hover:scale-105 hover:shadow-md'
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-[-100%] group-hover:translate-x-[100%]" />
                <CloudSyncIcon status={syncStatus} />
                {pendingCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 z-20" />
                )}
              </button>
            )}
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
