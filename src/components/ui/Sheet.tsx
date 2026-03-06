'use client';

import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';

interface SheetProps {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Height of the panel. Both sheets use the same value for symmetric animation. */
  height?: string;
}

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

// Drag-to-close threshold: swipe down >80px or fast velocity
const CLOSE_THRESHOLD = 80;

const EASE = [0.23, 1, 0.32, 1] as const;

export function Sheet({ onClose, title, children, height = SHEET_HEIGHT }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Motion value for pan-to-dismiss gesture offset (separate from entry animation).
  // This drives the `top` style so it doesn't conflict with Framer Motion's `y` transform.
  const panOffset = useMotionValue(0);
  // Backdrop fades as user drags the sheet down
  const backdropOpacity = useTransform(panOffset, [0, 400], [1, 0]);

  // Prevent background scroll while sheet is open.
  // We use overflow:hidden on <html> (not position:fixed on body) because
  // position:fixed on body creates a new containing block and breaks
  // position:fixed on descendants like this sheet panel.
  useEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevOverflow;
    };
  }, []);

  // Focus trap
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

  // Pan gesture: swipe down to dismiss.
  // Uses onPan/onPanEnd instead of drag="y" to avoid Framer Motion
  // taking over position/transform on the element.
  const handlePan = useCallback((_event: PointerEvent, info: PanInfo) => {
    // Only allow downward drag (positive y). Clamp upward movement to 0.
    panOffset.set(Math.max(0, info.offset.y));
  }, [panOffset]);

  const handlePanEnd = useCallback((_event: PointerEvent, info: PanInfo) => {
    if (info.offset.y > CLOSE_THRESHOLD || info.velocity.y > 500) {
      // Swipe exceeded threshold — animate off-screen then unmount
      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 600;
      animate(panOffset, panelHeight, { duration: 0.25, ease: EASE }).then(() => {
        onClose();
      });
    } else {
      // Snap back to resting position
      animate(panOffset, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  }, [panOffset, onClose]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-sm touch-none"
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — fixed to viewport bottom, slides up on enter via y transform */}
      <motion.div
        key="sheet-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Entry/exit animation via y (Framer Motion manages this transform)
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.45, ease: EASE }}
        // Pan offset is applied as marginTop so it doesn't conflict with the y transform.
        // marginTop shifts the panel downward within its fixed positioning.
        // position:fixed must be inline — .glass-panel sets position:relative for its ::before
        // pseudo-element, which overrides Tailwind's .fixed at equal specificity.
        style={{ position: 'fixed', height, marginTop: panOffset }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        className="inset-x-0 bottom-0 z-[var(--z-overlay)] glass-panel rounded-t-[2rem] border-white/10 flex flex-col overscroll-none touch-pan-x cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle indicator */}
        <div className="w-8 h-1 bg-white/20 rounded-full mx-auto mt-2 mb-1 shrink-0" aria-hidden="true" />

        {/* Header — fixed, never scrolls */}
        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
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
