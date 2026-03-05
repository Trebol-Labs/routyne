'use client';

import { useRef, useState, useEffect } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { HistoryEntry } from '@/types/workout';
import { Flame, Download, Upload, HardDrive } from 'lucide-react';
import { exportAllData, downloadExportFile, importAllData } from '@/lib/db/export';

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
    <Sheet onClose={onClose} title="Profile" maxHeight="92vh">
      <div className="px-4 sm:px-5 pb-5 space-y-4">
        {/* Avatar + Name Section */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-16 h-16 rounded-xl glass-panel border-white/20 flex items-center justify-center text-3xl">
            {profile.avatarEmoji}
          </div>
          <EmojiPicker value={profile.avatarEmoji} onChange={(emoji) => updateProfile({ avatarEmoji: emoji })} />
        </div>

        {/* Display name */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Name</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
            className="sunken-glass rounded-lg p-2.5 text-base font-black text-white w-full bg-transparent border-none outline-none placeholder:text-white/20"
            placeholder="Athlete"
            maxLength={24}
          />
        </div>

        {/* Settings Grid - Weight + Rest */}
        <div className="grid grid-cols-2 gap-3">
          {/* Weight unit */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Weight</label>
            <ToggleGroup
              options={['kg', 'lbs']}
              value={profile.weightUnit}
              onChange={(v) => updateProfile({ weightUnit: v as 'kg' | 'lbs' })}
              ariaLabel="Weight unit"
            />
          </div>

          {/* Default rest */}
          <div className="space-y-1">
            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Rest</label>
            <ToggleGroup
              options={['60s', '90s', '120s']}
              value={`${profile.defaultRestSeconds}s`}
              onChange={(v) => updateProfile({ defaultRestSeconds: parseInt(v) })}
              ariaLabel="Default rest duration"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Stats</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-0.5 px-2 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <span className="text-base font-black text-blue-400 font-display">{totalSessions}</span>
              <span className="text-[7px] font-black text-blue-400/60 uppercase tracking-widest">Sessions</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <span className="text-base font-black text-indigo-400 font-display">
                {totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}` : '—'}
              </span>
              <span className="text-[7px] font-black text-indigo-400/60 uppercase tracking-widest">{profile.weightUnit}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="text-base font-black text-emerald-400 font-display flex items-center gap-0.5">
                {streak}<Flame className="w-3 h-3" />
              </span>
              <span className="text-[7px] font-black text-emerald-400/60 uppercase tracking-widest">Streak</span>
            </div>
          </div>
        </div>

        {/* Data Management - Commented Out by Default */}
        {/* 
        <div className="space-y-2">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Data</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 glass-panel rounded-lg border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-[9px] font-black uppercase tracking-widest"
            >
              <Download className="w-3 h-3" />
              {isExporting ? 'Exporting…' : 'Export'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 glass-panel rounded-lg border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-[9px] font-black uppercase tracking-widest"
            >
              <Upload className="w-3 h-3" />
              {isImporting ? 'Importing…' : 'Import'}
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
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/3 border border-white/5">
              <HardDrive className="w-2.5 h-2.5 text-white/20" />
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{storageUsed} used</span>
            </div>
          )}
        </div>
        */}
      </div>
    </Sheet>
  );
}
