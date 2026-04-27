'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { Library, Play, Copy, Trash2, ChevronRight, Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function RoutineManagerView() {
  const {
    routineLibrary,
    currentRoutine,
    loadRoutineFromLibrary,
    deleteRoutineFromLibrary,
    duplicateRoutine,
    setCurrentView,
  } = useWorkoutStore();

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const handleLoad = async (id: string) => {
    await loadRoutineFromLibrary(id);
  };

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    await duplicateRoutine(id);
    setDuplicating(null);
  };

  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteAction = () => {
    if (confirmDelete) {
      deleteRoutineFromLibrary(confirmDelete);
      setConfirmDelete(null);
    }
  };

  return (
    <motion.div
      key="routine-manager"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-6 px-4 pb-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-10 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]" />
        <h2 className="font-display text-2xl font-black uppercase tracking-tighter text-white">
          Mis rutinas
        </h2>
      </div>

      {routineLibrary.length === 0 ? (
        <div className="glass-panel rounded-2xl border-white/5 px-6 py-12 text-center space-y-4">
          <Library className="w-12 h-12 text-white/10 mx-auto" />
          <p className="text-white/40 font-black uppercase tracking-tight">Aún no hay rutinas guardadas</p>
          <button
            onClick={() => setCurrentView('uploader')}
            className="active-glass-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" />
            Añadir rutina
          </button>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {routineLibrary.map((routine, idx) => {
            const isActive = currentRoutine?.id === routine.id;
            return (
              <motion.div
                key={routine.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              >
                <div
                  className={`glass-panel rounded-2xl p-4 border transition-all ${
                    isActive
                      ? 'border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                      : 'border-white/8 hover:border-white/15'
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {isActive && (
                          <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/15 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            Activa
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-base font-black uppercase tracking-tight text-white truncate">
                        {routine.title}
                      </h3>
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mt-1">
                        {routine.sessionCount} {routine.sessionCount === 1 ? 'sesión' : 'sesiones'} · {routine.exerciseCount} ejercicios
                      </p>
                    </div>

                    {/* Load button */}
                    <button
                      onClick={() => handleLoad(routine.id)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                        isActive
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                          : 'bg-white/[0.05] text-white/60 border border-white/8 hover:bg-white/10 hover:text-white/80'
                      }`}
                      aria-label={`Load ${routine.title}`}
                    >
                      {isActive ? <ChevronRight className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isActive ? 'Ver' : 'Cargar'}
                    </button>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
                    <p className="text-[9px] font-bold text-white/20">
                      {new Date(routine.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(routine.id)}
                        disabled={duplicating === routine.id}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
                        aria-label={`Duplicate ${routine.title}`}
                      >
                        <Copy className="w-3 h-3" />
                        {duplicating === routine.id ? '…' : 'Dup.'}
                      </button>
                      <button
                        onClick={() => handleDelete(routine.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors"
                        aria-label={`Delete ${routine.title}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        Borrar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {/* Add more routines */}
      {routineLibrary.length > 0 && (
        <button
          onClick={() => setCurrentView('uploader')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/10 text-[11px] font-black uppercase tracking-widest text-white/25 hover:border-white/20 hover:text-white/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir otra rutina
        </button>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="¿Borrar rutina?"
        message="Esta rutina se eliminará de tu biblioteca. El historial de entrenamiento se conserva."
        confirmLabel="Borrar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(null)}
      />
    </motion.div>
  );
}
