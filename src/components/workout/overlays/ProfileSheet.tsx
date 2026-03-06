'use client';

import { useRef, useState, useEffect } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import type { HistoryEntry } from '@/types/workout';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

// Commented out — uncomment when export/import needed
// import { Download, Upload, HardDrive } from 'lucide-react';
// import { exportAllData, downloadExportFile, importAllData } from '@/lib/db/export';

const SPORT_EMOJIS = ['💪','🏋️','🔥','⚡','🎯','🏃','🥊','🧗','🚴','🤸','🏊','🎽','🦾','⚔️','🛡️','🌟','💎','🎖️','🔱','🦁'];
const REST_OPTIONS = [{ label: '60s', value: 60 }, { label: '90s', value: 90 }, { label: '2m', value: 120 }];
const UNIT_OPTIONS: Array<'kg' | 'lbs'> = ['kg', 'lbs'];

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

  // Commented out — re-enable when backup features are needed
  // const fileInputRef = useRef<HTMLInputElement>(null);
  // const [isExporting, setIsExporting] = useState(false);
  // const [isImporting, setIsImporting] = useState(false);

  const totalSessions = history.length;
  const totalVolume = history.reduce((sum, e) => sum + e.totalVolume, 0);
  const streak = computeStreak(history);

  return (
    <Sheet onClose={onClose} title="Profile">
      {/*
        Layout — all rows fixed height, nothing overflows:
        Row 1: Avatar (56px) + Name input            ~56px
        Row 2: Emoji horizontal scroll strip         ~40px
        Row 3: Divider label                         ~16px
        Row 4: Weight toggle + Rest toggle           ~36px
        Row 5: Stats 3-up                            ~52px
        Total content ≈ 200px, header ≈ 52px → fits comfortably in 72vh
      */}
      <div className="h-full px-4 pb-4 flex flex-col gap-3 overflow-hidden">

        {/* Row 1 — Avatar + Name side by side */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-14 h-14 rounded-xl glass-panel border-white/10 flex items-center justify-center text-2xl shrink-0">
            {profile.avatarEmoji}
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.25em]">Display Name</label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) => updateProfile({ displayName: e.target.value })}
              className="sunken-glass rounded-lg px-2.5 py-2 text-sm font-black text-white w-full bg-transparent border-none outline-none placeholder:text-white/20"
              placeholder="Athlete"
              maxLength={24}
            />
          </div>
        </div>

        {/* Row 2 — Emoji picker: single horizontal scroll strip, no wrap */}
        <div className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar">
          {SPORT_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => updateProfile({ avatarEmoji: emoji })}
              className={cn(
                'shrink-0 w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all duration-200',
                profile.avatarEmoji === emoji
                  ? 'active-glass-btn scale-105'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              )}
              aria-label={`Select ${emoji}`}
              aria-pressed={profile.avatarEmoji === emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="shrink-0 border-t border-white/[0.06]" />

        {/* Row 3 — Settings: Weight + Rest in one row */}
        <div className="shrink-0 flex gap-3">
          {/* Weight unit */}
          <div className="flex-1 space-y-1">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.25em]">Weight</span>
            <div className="flex gap-1">
              {UNIT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => updateProfile({ weightUnit: opt })}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                    profile.weightUnit === opt
                      ? 'active-glass-btn text-white'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Default rest */}
          <div className="flex-1 space-y-1">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.25em]">Rest</span>
            <div className="flex gap-1">
              {REST_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => updateProfile({ defaultRestSeconds: value })}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                    profile.defaultRestSeconds === value
                      ? 'active-glass-btn text-white'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 4 — Stats: 3 cards in a row */}
        <div className="shrink-0 grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <span className="text-base font-black text-blue-400 font-display leading-none">{totalSessions}</span>
            <span className="text-[7px] font-black text-blue-400/50 uppercase tracking-widest mt-0.5">Sessions</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <span className="text-base font-black text-indigo-400 font-display leading-none">
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : '—'}
            </span>
            <span className="text-[7px] font-black text-indigo-400/50 uppercase tracking-widest mt-0.5">{profile.weightUnit}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-base font-black text-emerald-400 font-display leading-none flex items-center gap-0.5">
              {streak}<Flame className="w-3 h-3" />
            </span>
            <span className="text-[7px] font-black text-emerald-400/50 uppercase tracking-widest mt-0.5">Streak</span>
          </div>
        </div>

        {/* Remaining space filler — keeps layout anchored to top */}
        <div className="flex-1" />

        {/*
          Data Management — commented out to keep sheet compact.
          Uncomment to re-enable backup features:

        <div className="shrink-0 flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 glass-panel rounded-xl border-white/10 text-white/50 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Download className="w-3 h-3" />
            {isExporting ? '…' : 'Export'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 glass-panel rounded-xl border-white/10 text-white/50 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all"
          >
            <Upload className="w-3 h-3" />
            {isImporting ? '…' : 'Import'}
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" title="Import backup" onChange={handleImport} />
        </div>
        */}
      </div>
    </Sheet>
  );
}
