'use client';

import { Sheet } from '@/components/ui/Sheet';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { HistoryEntry } from '@/types/workout';
import { Flame } from 'lucide-react';

function computeStreak(history: HistoryEntry[]): number {
  const days = new Set(history.map((e) => new Date(e.completedAt).toDateString()));
  let streak = 0;
  const check = new Date();
  while (days.has(check.toDateString())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

interface ProfileSheetProps {
  onClose: () => void;
}

export function ProfileSheet({ onClose }: ProfileSheetProps) {
  const { profile, updateProfile, history } = useWorkoutStore();

  const totalSessions = history.length;
  const totalVolume = history.reduce((sum, e) => sum + e.totalVolume, 0);
  const streak = computeStreak(history);

  return (
    <Sheet onClose={onClose} title="Profile" maxHeight="92vh">
      <div className="px-6 pb-10 space-y-8">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-[2rem] glass-panel border-white/20 flex items-center justify-center text-4xl">
            {profile.avatarEmoji}
          </div>
          <EmojiPicker value={profile.avatarEmoji} onChange={(emoji) => updateProfile({ avatarEmoji: emoji })} />
        </div>

        {/* Display name */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Display Name</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
            className="sunken-glass rounded-2xl p-4 text-xl font-black text-white w-full bg-transparent border-none outline-none placeholder:text-white/20"
            placeholder="Athlete"
            maxLength={24}
          />
        </div>

        {/* Weight unit */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Weight Unit</label>
          <ToggleGroup
            options={['kg', 'lbs']}
            value={profile.weightUnit}
            onChange={(v) => updateProfile({ weightUnit: v as 'kg' | 'lbs' })}
            ariaLabel="Weight unit"
          />
        </div>

        {/* Default rest */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Default Rest</label>
          <ToggleGroup
            options={['60s', '90s', '120s']}
            value={`${profile.defaultRestSeconds}s`}
            onChange={(v) => updateProfile({ defaultRestSeconds: parseInt(v) })}
            ariaLabel="Default rest duration"
          />
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Your Stats</span>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 px-3 py-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <span className="text-xl font-black text-blue-400 font-display">{totalSessions}</span>
              <span className="text-[9px] font-black text-blue-400/60 uppercase tracking-widest">Sessions</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-3 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <span className="text-xl font-black text-indigo-400 font-display">
                {totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}` : '—'}
              </span>
              <span className="text-[9px] font-black text-indigo-400/60 uppercase tracking-widest">{profile.weightUnit}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-3 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <span className="text-xl font-black text-emerald-400 font-display flex items-center gap-1">
                {streak}<Flame className="w-4 h-4" />
              </span>
              <span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest">Streak</span>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
