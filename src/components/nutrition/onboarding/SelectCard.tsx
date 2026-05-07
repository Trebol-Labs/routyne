'use client';

import type { ReactNode } from 'react';

interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  compact?: boolean;
}

export function SelectCard({ selected, onClick, title, description, icon, compact }: SelectCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'w-full text-left rounded-2xl border transition-all',
        compact ? 'p-3' : 'p-4',
        selected
          ? 'border-[rgb(var(--accent-primary-rgb))] bg-[rgb(var(--accent-primary-rgb))]/10 shadow-[0_0_0_1px_rgb(var(--accent-primary-rgb))]'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="shrink-0 text-2xl">{icon}</div> : null}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-sm">{title}</div>
          {description ? (
            <div className="mt-0.5 text-xs text-white/50 leading-snug">{description}</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
