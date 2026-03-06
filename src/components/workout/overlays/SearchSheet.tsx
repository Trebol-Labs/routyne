'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ExerciseBrowseItem } from '@/types/workout';
import { Dumbbell, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const BODY_PARTS = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];

interface SearchSheetProps {
  onClose: () => void;
}

function ExerciseBrowseCard({ item }: { item: ExerciseBrowseItem }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors cursor-pointer">
      <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
        {item.gifUrl ? (
          <img src={item.gifUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Dumbbell className="w-4 h-4 text-white/20" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white/80 uppercase tracking-tight truncate">{item.name}</p>
        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mt-0.5">{item.bodyPart} · {item.equipment}</p>
      </div>
    </div>
  );
}

export function SearchSheet({ onClose }: SearchSheetProps) {
  const { history, profile } = useWorkoutStore();
  const [tab, setTab] = useState<'exercises' | 'history'>('exercises');
  const [query, setQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('All');
  const [results, setResults] = useState<ExerciseBrowseItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Removed auto-focus to prevent keyboard from popping up immediately and causing layout shifts on mobile
  }, []);

  useEffect(() => {
    if (tab !== 'exercises') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (selectedBodyPart && selectedBodyPart !== 'All') params.set('bodyPart', selectedBodyPart.toLowerCase());
        const res = await fetch(`/api/exercises/browse?${params}`);
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, selectedBodyPart, tab]);

  const filteredHistory = history.filter((e) =>
    e.sessionTitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Sheet onClose={onClose} title="Search">
      {/*
        Layout — fixed-height panel, only the results list scrolls:
        Row 1: Tabs (shrink-0)                     ~32px
        Row 2: Search input (shrink-0)             ~36px
        Row 3: Body part chips (shrink-0, x-scroll)~24px
        Row 4: Results list (flex-1, y-scroll)     fills remaining height
      */}
      <div className="h-full px-4 pb-4 flex flex-col gap-2.5 overflow-hidden">

        {/* Row 1 — Tabs */}
        <div className="shrink-0 flex gap-1">
          {(['exercises', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                tab === t ? 'active-glass-btn text-white' : 'bg-white/5 text-white/30 hover:text-white/50'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Row 2 — Search input */}
        <div className="shrink-0 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'exercises' ? 'Search exercises...' : 'Search sessions...'}
            className="sunken-glass rounded-lg pl-8 pr-3 py-2 text-sm font-black text-white w-full bg-transparent border-none outline-none placeholder:text-white/20"
          />
        </div>

        {tab === 'exercises' && (
          <>
            {/* Row 3 — Body part chips (horizontal scroll only) */}
            <div className="shrink-0 flex gap-1 overflow-x-auto overscroll-contain no-scrollbar -mx-0.5 px-0.5">
              {BODY_PARTS.map((bp) => (
                <button
                  key={bp}
                  onClick={() => setSelectedBodyPart(bp)}
                  className={cn(
                    'shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest transition-all',
                    selectedBodyPart === bp
                      ? 'active-glass-btn text-white'
                      : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/60'
                  )}
                >
                  {bp}
                </button>
              ))}
            </div>

            {/* Row 4 — Results list: ONLY this scrolls */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar space-y-1.5">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/5" />
                ))
              ) : results.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                  <Dumbbell className="w-6 h-6 text-white/10" />
                  <p className="text-[10px] font-black text-white/25 uppercase tracking-widest">No exercises found</p>
                </div>
              ) : (
                results.map((item) => <ExerciseBrowseCard key={item.id} item={item} />)
              )}
            </div>
          </>
        )}

        {tab === 'history' && (
          /* History results: ONLY this scrolls */
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain no-scrollbar space-y-1.5">
            {filteredHistory.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <p className="text-[10px] font-black text-white/25 uppercase tracking-widest">No sessions found</p>
              </div>
            ) : (
              filteredHistory.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white/80 uppercase tracking-tight truncate">{entry.sessionTitle}</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-0.5">
                      {new Date(entry.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {entry.volumeData.length} exercises
                    </p>
                  </div>
                  {entry.totalVolume > 0 && (
                    <span className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest shrink-0 ml-2">
                      {entry.totalVolume.toLocaleString()} {profile.weightUnit}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
