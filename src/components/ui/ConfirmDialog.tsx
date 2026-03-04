'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusLock from 'react-focus-lock';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          onClick={onCancel}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          <FocusLock>
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="relative glass-panel rounded-[2.5rem] p-8 w-full max-w-sm space-y-6 border-white/15"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <h3 id="confirm-title" className="text-xl font-black text-white uppercase tracking-tight">{title}</h3>
                <p id="confirm-message" className="text-sm font-medium text-white/50">{message}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-[11px] font-black uppercase tracking-widest"
                >
                  {cancelLabel}
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    variant === 'danger'
                      ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 hover:border-red-500/50'
                      : 'active-glass-btn text-white'
                  }`}
                >
                  {confirmLabel}
                </button>
              </div>
            </motion.div>
          </FocusLock>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
