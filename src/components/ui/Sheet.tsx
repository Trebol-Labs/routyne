'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

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

export function Sheet({ onClose, title, children, maxHeight = '90vh' }: SheetProps) {
  return (
    <>
      <motion.div
        key="sheet-backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[199] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="sheet-panel"
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-0 left-0 right-0 z-[200] glass-panel rounded-t-[2.5rem] border-white/10 overflow-hidden"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
          <h2 className="text-lg font-black text-white uppercase tracking-tight font-display">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
          {children}
        </div>
      </motion.div>
    </>
  );
}
