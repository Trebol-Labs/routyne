'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Sheet } from '@/components/ui/Sheet';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAuth } from '@/hooks/useAuth';
import {
  saveBodyweight,
  loadBodyweightHistory,
  deleteBodyweightEntry,
} from '@/lib/db/bodyweight';
import type { Bodyweight } from '@/types/workout';
import { Trash2, Scale } from 'lucide-react';
import { enqueue } from '@/lib/sync/queue';

interface BodyWeightSheetProps {
  onClose: () => void;
  onSaved?: () => void;
}

function toLocalDateString(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}

export function BodyWeightSheet({ onClose, onSaved }: BodyWeightSheetProps) {
  const { profile } = useWorkoutStore();
  const { user } = useAuth();
  const unit = profile.weightUnit;
  const supabaseEnabled = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Bodyweight[]>([]);

  useEffect(() => {
    loadBodyweightHistory(5).then(setRecent);
  }, []);

  const handleSave = async () => {
    const parsed = parseFloat(weightInput);
    if (isNaN(parsed) || parsed <= 0) return;

    setSaving(true);
    const entry: Bodyweight = {
      id: uuidv4(),
      date: toLocalDateString(),
      weight: parsed,
      unit,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };
    await saveBodyweight(entry);
    if (supabaseEnabled && user) {
      enqueue({ table: 'bodyweight', operation: 'upsert', payload: entry }).catch(console.error);
    }
    setWeightInput('');
    const updated = await loadBodyweightHistory(5);
    setRecent(updated);
    setSaving(false);
    onSaved?.();
  };

  const handleDelete = async (entry: Bodyweight) => {
    const deletedAt = new Date().toISOString();
    const tombstone: Bodyweight = { ...entry, updatedAt: deletedAt, deletedAt };
    await deleteBodyweightEntry(entry.id);
    if (supabaseEnabled && user) {
      enqueue({ table: 'bodyweight', operation: 'delete', payload: tombstone }).catch(console.error);
    }
    setRecent((prev) => prev.filter((e) => e.id !== entry.id));
    onSaved?.();
  };

  const latest = recent[0];

  return (
    <Sheet onClose={onClose} title="Registrar peso">
      <div className="px-4 pb-6 space-y-6">

        {/* Latest reading */}
        {latest && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <Scale className="w-4 h-4 text-blue-400/60 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Último registro</p>
              <p className="text-sm font-black text-white/80">
                {latest.weight} {latest.unit}
                <span className="ml-2 text-white/35 font-bold text-xs">{latest.date}</span>
              </p>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
            Peso ({unit})
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="500"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={`p. ej. ${unit === 'kg' ? '75.5' : '165.0'}`}
              className="sunken-glass flex-1 rounded-xl px-4 py-3 text-lg font-black text-white bg-transparent border-none outline-none placeholder:text-white/20"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving || !weightInput}
              className="active-glass-btn px-5 rounded-xl text-sm font-black uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? '…' : 'Guardar'}
            </button>
          </div>
        </div>

        {/* Recent entries */}
        {recent.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Recientes</p>
            {recent.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]"
              >
                <div>
                  <span className="text-sm font-black text-white/80">{entry.weight} {entry.unit}</span>
                  <span className="ml-3 text-[10px] font-bold text-white/30">{entry.date}</span>
                </div>
                <button
                  onClick={() => handleDelete(entry)}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  aria-label="Eliminar registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
