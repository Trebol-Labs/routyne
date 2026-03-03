'use client';

import { cn } from '@/lib/utils';

const SPORT_EMOJIS = ['💪','🏋️','🔥','⚡','🎯','🏃','🥊','🧗','🚴','🤸','🏊','🎽','🦾','⚔️','🛡️','🌟','💎','🎖️','🔱','🦁'];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {SPORT_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onChange(emoji)}
          className={cn(
            'w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all duration-200',
            value === emoji
              ? 'active-glass-btn scale-110'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
          )}
          aria-label={`Select ${emoji}`}
          aria-pressed={value === emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
