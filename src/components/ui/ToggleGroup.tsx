'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToggleGroupProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}

export function ToggleGroup({ options, value, onChange, ariaLabel }: ToggleGroupProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="sunken-glass rounded-[1.5rem] p-1.5 flex gap-1"
    >
      {options.map((opt) => {
        const isSelected = opt === value;
        return (
          <button
            key={opt}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt)}
            className={cn(
              'relative flex-1 py-2 px-3 rounded-[1.2rem] text-sm font-black uppercase tracking-widest transition-colors duration-200',
              isSelected ? 'text-white' : 'text-white/40 hover:text-white/60'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={`toggle-${ariaLabel}`}
                className="absolute inset-0 active-glass-btn rounded-[1.2rem]"
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              />
            )}
            <span className="relative z-10">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
