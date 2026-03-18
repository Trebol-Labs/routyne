'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ShareCard } from '@/components/workout/ShareCard';
import type { WorkoutSummary } from '@/types/workout';

const EASE = [0.23, 1, 0.32, 1] as const;
const CLOSE_THRESHOLD = 80;

interface ShareCardSheetProps {
  summary: WorkoutSummary;
  weightUnit: string;
  onClose: () => void;
}

type CaptureState = 'idle' | 'capturing' | 'sharing' | 'downloading';

export function ShareCardSheet({ summary, weightUnit, onClose }: ShareCardSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const panOffset = useMotionValue(0);
  const [captureState, setCaptureState] = useState<CaptureState>('idle');

  const handlePan = useCallback(
    (_e: PointerEvent, info: PanInfo) => {
      panOffset.set(Math.max(0, info.offset.y));
    },
    [panOffset],
  );

  const handlePanEnd = useCallback(
    (_e: PointerEvent, info: PanInfo) => {
      if (info.offset.y > CLOSE_THRESHOLD || info.velocity.y > 500) {
        const h = panelRef.current?.getBoundingClientRect().height ?? 700;
        animate(panOffset, h, { duration: 0.25, ease: EASE }).then(onClose);
      } else {
        animate(panOffset, 0, { type: 'spring', stiffness: 500, damping: 30 });
      }
    },
    [panOffset, onClose],
  );

  async function captureCard(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  const handleDownload = async () => {
    setCaptureState('downloading');
    try {
      const blob = await captureCard();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `routyne-${summary.entry.sessionTitle.toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ShareCardSheet] download failed', err);
    } finally {
      setCaptureState('idle');
    }
  };

  const handleShare = async () => {
    setCaptureState('sharing');
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('capture failed');

      const file = new File([blob], 'routyne-workout.png', { type: 'image/png' });
      const text = `Just finished ${summary.entry.sessionTitle}! ${summary.totalSets} sets · ${Math.round(summary.entry.totalVolume)} ${weightUnit} volume${summary.newPRs.length > 0 ? ` · ${summary.newPRs.length} new PR${summary.newPRs.length > 1 ? 's' : ''}! 🏆` : ' 💪'}`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else if (navigator.share) {
        // Fallback: share text only (files not supported on this device)
        await navigator.share({ title: 'Routyne Workout', text });
      }
    } catch (err) {
      // User cancelled or share API not available — silent
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[ShareCardSheet] share failed', err);
      }
    } finally {
      setCaptureState('idle');
    }
  };

  const isBusy = captureState !== 'idle';
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="sharecard-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-sm touch-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <motion.div
        key="sharecard-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Share workout card"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, y: panOffset }}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        className="z-[var(--z-overlay)] glass-panel rounded-t-3xl border-white/10 overscroll-none touch-pan-x cursor-grab active:cursor-grabbing max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Share</p>
            <h3 className="font-display text-xl font-black uppercase leading-tight tracking-tight text-white">
              Workout Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] transition-colors hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>

        <div className="space-y-5 px-5 pb-8">
          {/* Card preview — centered, scaled to fit */}
          <div className="flex justify-center">
            <div
              style={{
                transform: 'scale(0.82)',
                transformOrigin: 'top center',
                marginBottom: '-78px', // compensate for scale shrink
              }}
            >
              <div ref={cardRef}>
                <ShareCard summary={summary} weightUnit={weightUnit} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {canShare && (
              <button
                onClick={handleShare}
                disabled={isBusy}
                className="active-glass-btn flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black uppercase tracking-wider disabled:opacity-50"
              >
                {captureState === 'sharing' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                Share
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={isBusy}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-sm font-black uppercase tracking-wider text-white/70 hover:bg-white/[0.07] disabled:opacity-50 transition-colors"
            >
              {captureState === 'downloading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Save PNG
            </button>
          </div>

          {!canShare && (
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-white/25">
              Web Share not available — use Save PNG
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
