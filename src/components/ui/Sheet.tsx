'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface SheetProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] as const } },
  exit: { y: '100%', transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] as const } },
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function Sheet({ onClose, title, children, maxHeight = '90vh' }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that triggered the sheet so we can restore focus on close
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    // Move focus into the panel on mount
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    return () => {
      // Restore focus to the trigger element on unmount
      previousFocusRef.current?.focus();
    };
  }, []);

  // Escape key + focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      <motion.div
        key="sheet-backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        key="sheet-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-0 left-0 right-0 z-[var(--z-overlay)] glass-panel rounded-t-[var(--radius-xl)] border-white/10 overflow-hidden"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full absolute top-3 left-1/2 -translate-x-1/2" aria-hidden="true" />
          <h2 className="text-lg font-black text-white uppercase tracking-tight font-display">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
          {children}
        </div>
      </motion.div>
    </>
  );
}
