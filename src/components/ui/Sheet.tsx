'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SheetProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Height of the panel. Both sheets use the same value for symmetric animation. */
  height?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// Panel always slides from exactly `height` below the bottom — same start for every sheet
const panelVariants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { duration: 0.45, ease: [0.23, 1, 0.32, 1] as const } },
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

// Shared fixed height — both dialogs open to the same point on screen
const SHEET_HEIGHT = '72vh';

// Drag-to-close threshold: swipe down >60px to trigger close
const CLOSE_THRESHOLD = 60;

export function Sheet({ onClose, title, children, height = SHEET_HEIGHT }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    // We intentionally DO NOT auto-focus elements on mount.
    // On mobile devices, focusing an input inside the Sheet (like Profile Name or Search)
    // immediately triggers the software keyboard to open. This causes the viewport (dvh) 
    // to rapidly resize, resulting in the background violently jumping/squishing 
    // while the Sheet is trying to animate in. 
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Drag-to-close handler
  const handlePanelDragEnd = (_event: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y > CLOSE_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  return (
    <>
      <motion.div
        key="sheet-backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-sm touch-none"
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
        drag="y"
        dragElastic={{ top: 0, bottom: 0.3 }}
        dragConstraints={{ top: 0, bottom: 300 }}
        onDragEnd={handlePanelDragEnd}
        onDrag={(_event, info) => setDragY(info.offset.y)}
        className="fixed bottom-0 left-0 right-0 z-[var(--z-overlay)] glass-panel rounded-t-[2rem] border-white/10 flex flex-col overscroll-none cursor-grab active:cursor-grabbing"
        style={{ height }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fixed, never scrolls */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <div className="w-8 h-1 bg-white/20 rounded-full absolute top-2 left-1/2 -translate-x-1/2" aria-hidden="true" />
          <h2 className="text-sm font-black text-white uppercase tracking-widest font-display">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3 h-3 text-white/60" />
          </button>
        </div>

        {/* Content area — children control their own overflow */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </motion.div>
    </>
  );
}
