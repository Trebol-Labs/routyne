'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, Code, Dumbbell, Trash2 } from 'lucide-react';
import { parseRoutine } from '@/lib/markdown/parser';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

export function RoutineUploader() {
  const [text, setText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    importRoutine,
    isLoading,
    setIsLoading,
    routineLibrary,
    loadRoutineFromLibrary,
    deleteRoutineFromLibrary,
  } = useWorkoutStore();

  const handleParse = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const routine = parseRoutine(content);
      await importRoutine(routine, content);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save routine';
      setError(message);
      console.error('Failed to parse or save routine:', error);
    } finally {
      setIsLoading(false);
    }
  }, [importRoutine, setIsLoading]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.md') || file.type === 'text/markdown')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
        handleParse(content);
      };
      reader.readAsText(file);
    }
  }, [handleParse]);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-4 px-1">
      {/* Header block */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col items-center gap-2 pt-2"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full shadow-xl"
        >
          <Code className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-black text-white/80 uppercase tracking-[0.25em] font-display">Markdown Parser</span>
        </motion.div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-liquid leading-none text-center font-display">
          IMPORT <span className="brightness-125 [-webkit-text-fill-color:#3b82f6]">ROUTINE</span>
        </h1>
        <p className="text-white/35 font-medium text-sm tracking-tight text-center">Paste your raw markdown. We handle the rest.</p>
      </motion.div>

      {/* Main card */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "relative group transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "rounded-[2.2rem] p-1 w-full",
          isDragging ? "scale-[1.02] rotate-[0.5deg]" : "hover:scale-[1.005]"
        )}
      >
        <div className="absolute inset-0 bg-blue-600/10 blur-[80px] rounded-[2.2rem] opacity-40 group-hover:opacity-55 transition-opacity pointer-events-none" />

        <div className="relative glass-panel rounded-[2rem] p-4 sm:p-6 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex flex-col items-center justify-center py-14 gap-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 blur-[40px] rounded-full animate-pulse" />
                  <Loader2 className="w-14 h-14 text-white animate-[spin_2s_linear_infinite]" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-white font-black text-xl tracking-tighter">Syncing Structure...</p>
                  <p className="text-blue-400/60 text-xs font-black uppercase tracking-[0.3em]">Processing Nodes</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                {/* Textarea */}
                <div className="relative group/input">
                  <div className="absolute -inset-px bg-white/5 rounded-2xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="# Push Day&#10;## Bench Press&#10;- 3x12&#10;- Rest: 90s"
                    className="w-full h-32 sm:h-44 bg-black/30 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/5 focus:ring-0 text-white placeholder:text-white/10 resize-none font-mono text-sm leading-relaxed selection:bg-blue-500/40 sunken-glass"
                  />
                </div>

                {/* Action buttons — always side by side */}
                {/* Hidden file input — triggered programmatically to avoid label/pointer-event issues */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,text/markdown"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        setText(content);
                        handleParse(content);
                      };
                      reader.readAsText(file);
                      // Reset so the same file can be re-selected
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex items-stretch gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2.5 px-5 py-4 glass-btn rounded-[1.5rem] cursor-pointer flex-1"
                  >
                    <Upload className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.18em] leading-none whitespace-nowrap font-display">Select .md</span>
                  </button>

                  <Button
                    variant="glass-primary"
                    size="lg"
                    onClick={() => handleParse(text)}
                    disabled={!text.trim() || isLoading}
                    className="flex-[1.6] text-[11px] tracking-[0.15em] rounded-[1.5rem] py-4"
                  >
                    GENERATE
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[2.2rem] bg-blue-500/20 backdrop-blur-2xl border-2 border-white/30 pointer-events-none">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)]">
                <Upload className="w-9 h-9 text-blue-600" />
              </div>
              <span className="text-white font-black text-2xl tracking-tighter">GENERATE</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="w-full rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-3"
        >
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {/* Saved Routines Library */}
      <AnimatePresence>
        {routineLibrary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-2.5"
          >
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-1">Saved Routines</p>
            <div className="flex flex-col gap-2">
              {routineLibrary.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-panel rounded-[1.5rem] px-4 py-3 border-white/10 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm uppercase tracking-tight truncate font-display">{r.title}</p>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-0.5">
                      {r.sessionCount} day{r.sessionCount !== 1 ? 's' : ''} · {r.exerciseCount} exercises
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="glass-primary"
                      size="sm"
                      onClick={() => loadRoutineFromLibrary(r.id)}
                      className="text-[10px] px-4 py-2 rounded-xl"
                    >
                      Load
                    </Button>
                    <button
                      onClick={() => setPendingDeleteId(r.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      aria-label={`Delete ${r.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete Routine?"
        message={`"${routineLibrary.find((r) => r.id === pendingDeleteId)?.title ?? ''}" will be removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          if (pendingDeleteId) deleteRoutineFromLibrary(pendingDeleteId);
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
