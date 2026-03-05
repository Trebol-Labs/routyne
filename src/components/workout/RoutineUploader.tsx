'use client';

import React, { useState, useCallback } from 'react';
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
    <div className="w-full max-w-2xl mx-auto space-y-6 p-4 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2 w-full flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-full glass-border-light shadow-2xl"
        >
          <Code className="w-4 h-4 text-blue-400" />
          <span className="text-[12px] font-black text-white/90 uppercase tracking-[0.25em] font-display">Markdown Parser</span>
        </motion.div>

        <h1 className="text-3xl sm:text-6xl font-black tracking-tighter text-liquid leading-tight text-center font-display">
          IMPORT <span className="brightness-125 [-webkit-text-fill-color:#3b82f6]">ROUTINE</span>
        </h1>
        <p className="text-white/40 font-medium text-sm tracking-tight max-w-xs mx-auto">Paste your raw markdown. We handle the rest.</p>
      </motion.div>

      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative group transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
          "rounded-[3rem] p-1.5 w-full",
          isDragging
            ? "scale-[1.03] rotate-1"
            : "hover:scale-[1.01]"
        )}
      >
        <div className="absolute inset-0 bg-blue-600/10 blur-[120px] rounded-[3rem] opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none" />
        {/* Main Glass Hero Panel */}
        <div className="relative glass-panel rounded-[2.8rem] p-5 sm:p-8 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full" />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex flex-col items-center justify-center py-20 space-y-8"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 blur-[40px] rounded-full animate-pulse" />
                  <Loader2 className="w-20 h-20 text-white animate-[spin_2s_linear_infinite]" />
                </div>
                <div className="text-center space-y-3">
                  <p className="text-white font-black text-2xl tracking-tighter">Syncing Structure...</p>
                  <p className="text-blue-400/60 text-xs font-black uppercase tracking-[0.3em]">Processing Nodes</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="relative group/input">
                  <div className="absolute -inset-px bg-white/5 rounded-3xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="# Push Day&#10;## Bench Press&#10;- 3x12&#10;- Rest: 90s"
                    className="w-full h-36 sm:h-56 bg-black/30 backdrop-blur-md rounded-3xl p-6 border border-white/5 focus:ring-0 text-white placeholder:text-white/10 resize-none font-mono text-lg leading-relaxed selection:bg-blue-500/40 sunken-glass"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full">
                  <label className="flex items-center gap-4 px-8 py-5 glass-btn rounded-[2rem] cursor-pointer w-full sm:w-auto justify-center">
                    <Upload className="w-5 h-5 text-blue-400" />
                    <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em] leading-none whitespace-nowrap font-display">Drop or Select .md</span>
                    <input
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
                        }
                      }}
                    />
                  </label>

                  <Button
                    variant="glass-primary"
                    size="xl"
                    onClick={() => handleParse(text)}
                    disabled={!text.trim() || isLoading}
                    className="w-full sm:w-auto"
                  >
                    GENERATE WORKOUT
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[3rem] bg-blue-500/20 backdrop-blur-2xl border-2 border-white/30 pointer-events-none">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center space-y-6"
            >
              <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.4)]">
                <Upload className="w-12 h-12 text-blue-600" />
              </div>
              <span className="text-white font-black text-3xl tracking-tighter">GENERATE</span>
            </motion.div>
          </div>
        )}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full max-w-2xl rounded-2xl bg-red-500/10 border border-red-500/30 p-4"
        >
          <p className="text-red-400 text-sm font-medium">{error}</p>
        </motion.div>
      )}

      {/* Saved Routines Library */}
      <AnimatePresence>
        {routineLibrary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full space-y-3"
          >
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">Saved Routines</p>
            <div className="grid gap-3">
              {routineLibrary.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-[1.8rem] p-4 border-white/10 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5 text-blue-400" />
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
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
