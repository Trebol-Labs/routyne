'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, Code, Dumbbell, Trash2, LayoutTemplate, ChevronRight, Zap } from 'lucide-react';
import { parseRoutine } from '@/lib/markdown/parser';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { PROGRAM_TEMPLATES, type ProgramTemplate } from '@/lib/data/programs/index';
import { useI18n } from '@/components/i18n/LanguageProvider';

type Tab = 'templates' | 'create';
type CreateMode = 'visual' | 'markdown';

// ── Level badge ───────────────────────────────────────────────────────────────

const LEVEL_COLORS = {
  beginner: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  intermediate: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
  advanced: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
};

const GOAL_ICONS: Record<string, string> = {
  strength: '💪',
  hypertrophy: '📈',
  endurance: '🏃',
  general: '⚡',
};

function ProgramCard({
  program,
  onSelect,
  isLoading,
}: {
  program: ProgramTemplate;
  onSelect: (p: ProgramTemplate) => void;
  isLoading: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(program)}
      disabled={isLoading}
      className="w-full glass-panel rounded-[1.5rem] px-4 py-3.5 border-white/10 flex items-center gap-3 text-left transition-colors hover:border-white/20 active:scale-[0.99] disabled:opacity-50"
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center shrink-0 text-xl">
        {GOAL_ICONS[program.goal] ?? '🏋'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-black text-sm uppercase tracking-tight truncate font-display">
          {program.name}
        </p>
        <p className="text-white/35 text-[10px] font-medium leading-snug mt-0.5 line-clamp-1">
          {program.description}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider', LEVEL_COLORS[program.level])}>
            {program.level}
          </span>
          <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">
          {program.daysPerWeek}d/sem
          </span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
    </motion.button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoutineUploader() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [createMode, setCreateMode] = useState<CreateMode>('visual');
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
    setCurrentView,
  } = useWorkoutStore();
  const { t, language } = useI18n();

  const handleParse = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const routine = parseRoutine(content);
      await importRoutine(routine, content);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save routine';
      setError(message);
      console.error('Failed to parse or save routine:', err);
    } finally {
      setIsLoading(false);
    }
  }, [importRoutine, setIsLoading]);

  const handleTemplateSelect = useCallback(async (program: ProgramTemplate) => {
    await handleParse(program.markdown);
  }, [handleParse]);

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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col items-center gap-2 pt-2"
      >
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-liquid leading-none text-center font-display">
          {t.uploader.heroTitle.split(' ')[0]} <span className="brightness-125 [-webkit-text-fill-color:#3b82f6]">{t.uploader.heroTitle.split(' ')[1]}</span>
        </h1>
        <p className="text-white/35 font-medium text-sm tracking-tight text-center">
          {t.uploader.heroBody}
        </p>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center gap-1 p-1 glass-panel rounded-2xl border-white/10"
      >
        {([
          { id: 'templates', label: t.createFlow.templates, icon: LayoutTemplate },
          { id: 'create', label: t.createFlow.create, icon: Code },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200',
              activeTab === id
                ? 'bg-white/[0.08] text-white border border-white/10'
                : 'text-white/30 hover:text-white/50',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'create' ? (
          <motion.div
            key="create-tab"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col gap-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCurrentView('routine-builder')}
                className="flex h-full items-start gap-3 rounded-[1.6rem] border border-sky-400/15 bg-sky-500/[0.06] p-4 text-left transition-all hover:border-sky-400/30 hover:bg-sky-500/[0.09]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10">
                  <Zap className="h-4 w-4 text-sky-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black uppercase tracking-tight text-sky-100">
                    {t.createFlow.buildVisual}
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-white/35">
                    {t.createFlow.buildVisualBody}
                  </p>
                  <span className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/80">
                    {t.createFlow.createRoutine}
                  </span>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-white/20" />
              </button>

              <button
                type="button"
                onClick={() => setCreateMode('markdown')}
                className={cn(
                  'flex h-full items-start gap-3 rounded-[1.6rem] border p-4 text-left transition-all',
                  createMode === 'markdown'
                    ? 'border-white/18 bg-white/[0.07]'
                    : 'border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]',
                )}
                aria-pressed={createMode === 'markdown'}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                  createMode === 'markdown'
                    ? 'border-blue-300/25 bg-blue-500/15'
                    : 'border-white/10 bg-white/[0.05]',
                )}>
                  <Code className={cn('h-4 w-4', createMode === 'markdown' ? 'text-blue-300' : 'text-white/55')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-black uppercase tracking-tight text-white">
                    {t.createFlow.fromMarkdown}
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-white/35">
                    {t.createFlow.importBody}
                  </p>
                  <span className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                    {t.createFlow.importMarkdown}
                  </span>
                </div>
                <ChevronRight className={cn('mt-0.5 h-4 w-4 shrink-0', createMode === 'markdown' ? 'text-white/45' : 'text-white/20')} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {createMode === 'markdown' && (
                <motion.div
                  key="markdown-create"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    'relative group transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] w-full',
                    isDragging ? 'scale-[1.02] rotate-[0.5deg]' : 'hover:scale-[1.005]',
                  )}
                >
                  <div className="absolute -inset-4 bg-blue-600/10 blur-[80px] rounded-[2rem] opacity-40 group-hover:opacity-55 transition-opacity pointer-events-none" />
                  <div className="relative glass-panel rounded-[1.8rem] p-4 overflow-hidden">
                    <div className="flex items-start justify-between gap-3 pb-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
                          {t.createFlow.advanced}
                        </p>
                        <h3 className="mt-1 text-lg font-black uppercase tracking-tighter text-white font-display">
                          {t.createFlow.fromMarkdown}
                        </h3>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        {t.createFlow.create}
                      </span>
                    </div>

                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.05 }}
                          className="flex flex-col items-center justify-center py-10 gap-5"
                        >
                          <Loader2 className="w-12 h-12 text-white animate-[spin_2s_linear_infinite]" />
                          <p className="text-white font-black text-lg tracking-tighter">{t.uploader.parsing}</p>
                        </motion.div>
                      ) : (
                        <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                          <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={t.createFlow.markdownPlaceholder}
                            className="w-full h-28 bg-black/30 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/5 focus:ring-0 text-white placeholder:text-white/10 resize-none font-mono text-sm leading-relaxed sunken-glass"
                          />
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".md,text/markdown"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => { const c = ev.target?.result as string; setText(c); handleParse(c); };
                                reader.readAsText(file);
                                e.target.value = '';
                              }
                            }}
                          />
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="glass-primary"
                              size="lg"
                              onClick={() => handleParse(text)}
                              disabled={!text.trim() || isLoading}
                              className="w-full text-[11px] tracking-[0.15em] rounded-2xl"
                            >
                              {t.createFlow.createRoutine}
                            </Button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center justify-center gap-1.5 py-2 text-white/25 hover:text-white/50 transition-colors cursor-pointer"
                            >
                              <Upload className="w-3 h-3 shrink-0" />
                              <span className="text-[9px] font-black uppercase tracking-[0.2em]">
                                {t.createFlow.selectMdFile}
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[1.8rem] bg-blue-500/20 backdrop-blur-2xl border-2 border-white/30 pointer-events-none">
                      <div className="flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-white" />
                        <span className="text-white font-black text-xl tracking-tighter">{t.createFlow.dropMarkdown}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="w-full rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-3">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}
          </motion.div>
        ) : (
          // ── Templates tab ──────────────────────────────────────────────────
          <motion.div
            key="templates-tab"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="flex flex-col gap-2"
          >

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-white/40 animate-[spin_2s_linear_infinite]" />
              </div>
            ) : (
              PROGRAM_TEMPLATES.map((program, i) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                  <ProgramCard program={program} onSelect={handleTemplateSelect} isLoading={isLoading} />
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Routines Library */}
      <AnimatePresence>
        {routineLibrary.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-2.5"
          >
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-1">
              {t.createFlow.createLibrary}
            </p>
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
                      {language === 'en'
                        ? `${r.sessionCount} session${r.sessionCount !== 1 ? 's' : ''} · ${r.exerciseCount} exercises`
                        : `${r.sessionCount} sesión${r.sessionCount !== 1 ? 'es' : ''} · ${r.exerciseCount} ejercicios`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="glass-primary"
                      size="sm"
                      onClick={() => loadRoutineFromLibrary(r.id)}
                      className="text-[10px] px-4 py-2 rounded-xl"
                    >
                      {t.manager.load}
                    </Button>
                    <button
                      onClick={() => setPendingDeleteId(r.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      aria-label={`${t.createFlow.deleteRoutine} ${r.title}`}
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
        title={t.createFlow.confirmDeleteRoutine}
        message={`"${routineLibrary.find((r) => r.id === pendingDeleteId)?.title ?? ''}" ${t.createFlow.confirmDeleteRoutineBody}`}
        confirmLabel={language === 'en' ? 'Delete' : 'Borrar'}
        cancelLabel={language === 'en' ? 'Cancel' : 'Cancelar'}
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
