'use client';

import { useRef, useState, useEffect } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { HistoryEntry } from '@/types/workout';
import { Flame, Download, Upload, HardDrive } from 'lucide-react';
import { exportAllData, downloadExportFile, importAllData } from '@/lib/db/export';
import { cn } from '@/lib/utils';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ProfileSheetProps {
  onClose: () => void;
}

export function ProfileSheet({ onClose }: ProfileSheetProps) {
  const { profile, updateProfile, history, hydrate } = useWorkoutStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [storageUsed, setStorageUsed] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const totalSessions = history.length;
  const totalVolume = history.reduce((sum, e) => sum + e.totalVolume, 0);
  const streak = computeStreak(history);

  useEffect(() => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        if (usage != null && quota != null) {
          setStorageUsed(`${formatBytes(usage)} / ${formatBytes(quota)}`);
        }
      }).catch(() => {});
    }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      downloadExportFile(data);
    } catch (err) {
      console.error('[ProfileSheet] export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(data);
      await hydrate();
    } catch (err) {
      console.error('[ProfileSheet] import failed', err);
      alert('Import failed. Make sure the file is a valid Routyne backup.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Sheet onClose={onClose} title="Profile" maxHeight="90vh">
      <div className="px-3 pb-3 grid grid-cols-2 gap-2.5 auto-rows-max">
        
        {/* Avatar - Full width at top */}
        <div className="col-span-2 flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-lg glass-panel border-white/20 flex items-center justify-center text-2xl">
            {profile.avatarEmoji}
          </div>
          <EmojiPicker value={profile.avatarEmoji} onChange={(emoji) => updateProfile({ avatarEmoji: emoji })} />
        </div>

        {/* Display Name - Full width */}
        <div className="col-span-2 space-y-0.5">
          <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Name</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
            className="sunken-glass rounded-lg px-2 py-1.5 text-sm font-black text-white w-full bg-transparent border-none outline-none placeholder:text-white/20"
            placeholder="Athlete"
            maxLength={24}
          />
        </div>

        {/* Weight Unit */}
        <div className="space-y-0.5">
          <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Weight</label>
          <ToggleGroup
            options={['kg', 'lbs']}
            value={profile.weightUnit}
            onChange={(v) => updateProfile({ weightUnit: v as 'kg' | 'lbs' })}
            ariaLabel="Weight unit"
          />
        </div>

        {/* Default Rest */}
        <div className="space-y-0.5">
          <label className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Rest</label>
          <div className="flex gap-1 text-[8px]">
            {['60s', '90s', '120s'].map((opt) => (
              <button
                key={opt}
                onClick={() => updateProfile({ defaultRestSeconds: parseInt(opt) })}
                className={cn(
                  'flex-1 px-1.5 py-1 rounded-md font-black uppercase tracking-widest transition-all text-[7px]',
                  `${profile.defaultRestSeconds}s` === opt
                    ? 'active-glass-btn text-white'
                    : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions Stat */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <span className="text-sm font-black text-blue-400 font-display">{totalSessions}</span>
          <span className="text-[6px] font-black text-blue-400/60 uppercase tracking-widest">Sessions</span>
        </div>

        {/* Volume Stat */}
        <div className="flex flex-col items-center gap-0.5 px-2 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <span className="text-sm font-black text-indigo-400 font-display leading-none">
            {totalVolume > 0 ? `${Math.round(totalVolume / 100)}` : '—'}
          </span>
          <span className="text-[6px] font-black text-indigo-400/60 uppercase tracking-widest">{profile.weightUnit}</span>
        </div>

        {/* Streak Stat */}
        <div className="col-span-2 flex flex-col items-center gap-0.5 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <span className="text-sm font-black text-emerald-400 font-display flex items-center gap-0.5">
            {streak}<Flame className="w-2.5 h-2.5" />
          </span>
          <span className="text-[6px] font-black text-emerald-400/60 uppercase tracking-widest">Day Streak</span>
        </div>

        {/* Data Management - Commented Out by Default */}
        {/* 
        <div className="col-span-2 space-y-1">
          <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Data</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-1 px-2 py-1.5 glass-panel rounded-lg border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-[7px] font-black uppercase tracking-widest"
            >
              <Download className="w-2.5 h-2.5" />
              {isExporting ? '...' : 'Export'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center justify-center gap-1 px-2 py-1.5 glass-panel rounded-lg border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-[7px] font-black uppercase tracking-widest"
            >
              <Upload className="w-2.5 h-2.5" />
              {isImporting ? '...' : 'Import'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              title="Import backup file"
              onChange={handleImport}
            />
          </div>

          {storageUsed && (
            <div className="col-span-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/3 border border-white/5">
              <HardDrive className="w-2 h-2 text-white/20 shrink-0" />
              <span className="text-[6px] font-black text-white/20 uppercase tracking-widest truncate">{storageUsed}</span>
            </div>
          )}
        </div>
        */}
      </div>
    </Sheet>
  );
}
