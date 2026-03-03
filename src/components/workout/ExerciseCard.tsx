'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ParsedExercise } from '@/types/workout';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaResult } from '@/lib/media/providers';

interface ExerciseCardProps {
  exercise: ParsedExercise;
  index: number;
}

const DEV = process.env.NODE_ENV === 'development';

export function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const [media, setMedia] = React.useState<MediaResult | null>(null);
  const [mediaLoaded, setMediaLoaded] = React.useState(false);
  const [mediaError, setMediaError] = React.useState(false);
  const [fetchDone, setFetchDone] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    if (!exercise.mediaUrl) {
      if (DEV) console.log(`[ExerciseCard] ${exercise.cleanName}: no mediaUrl`);
      return;
    }
    if (DEV) console.log(`[ExerciseCard] ${exercise.cleanName}: fetching ${exercise.mediaUrl}`);
    fetch(exercise.mediaUrl, DEV ? { cache: 'no-store' } : {})
      .then(r => {
        if (DEV) console.log(`[ExerciseCard] ${exercise.cleanName}: response ${r.status}`);
        return r.ok ? r.json() : null;
      })
      .then((data: MediaResult | null) => {
        if (DEV) console.log(`[ExerciseCard] ${exercise.cleanName}: media =`, data ?? 'null (404)');
        setMedia(data);
        setFetchDone(true);
      })
      .catch(err => {
        if (DEV) console.error(`[ExerciseCard] ${exercise.cleanName}: fetch error`, err);
        setMediaError(true);
        setFetchDone(true);
      });
  }, [exercise.mediaUrl]);

  React.useEffect(() => {
    if (DEV && fetchDone) {
      console.log(`[EC:${exercise.cleanName.slice(0,10)}] FD=${fetchDone} M=${JSON.stringify(media)} ML=${mediaLoaded} ME=${mediaError}`);
    }
  }, [fetchDone, media, mediaLoaded, mediaError]);

  // fetchDone + no media = API returned null/404 → show fallback
  const showFallback = mediaError || !exercise.mediaUrl || (fetchDone && !media);
  const isVideo = media?.type === 'video';
  const isGif = media?.type === 'gif' || media?.type === 'image';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full"
    >
      <div className="relative glass-panel rounded-[2rem] overflow-hidden p-4 transition-all duration-300 hover:border-white/15 flex flex-row items-center gap-4">

        {/* Media Section */}
        <div
          className="relative w-14 h-14 rounded-2xl bg-white/[0.06] overflow-hidden shrink-0 border border-white/10 transition-transform duration-300"
          onMouseEnter={() => setIsPlaying(true)}
          onMouseLeave={() => setIsPlaying(false)}
        >
          {!mediaLoaded && !showFallback && (
            <Skeleton className="absolute inset-0 w-full h-full bg-white/5" />
          )}

          {showFallback && (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <Dumbbell className="w-7 h-7" />
            </div>
          )}

          {isVideo && media && (
            <video
              src={media.url}
              autoPlay={isPlaying}
              muted
              loop
              playsInline
              className={cn(
                "w-full h-full object-cover transition-all duration-1000",
                mediaLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110",
                isPlaying ? "brightness-110 scale-110" : "brightness-50"
              )}
              onLoadedData={() => setMediaLoaded(true)}
              onError={() => setMediaError(true)}
            />
          )}

          {isGif && media && (
            <img
              src={media.url}
              alt={`${exercise.cleanName} form demonstration`}
              className={cn(
                "w-full h-full object-cover transition-all duration-1000",
                mediaLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => {
                if (DEV) console.log(`[ExerciseCard] ${exercise.cleanName}: image loaded ✓`);
                setMediaLoaded(true);
              }}
              onError={() => {
                if (media.fallbackUrl) {
                  setMedia({ ...media, url: media.fallbackUrl, type: 'image', fallbackUrl: undefined });
                } else {
                  setMediaError(true);
                }
              }}
            />
          )}

          {isVideo && !isPlaying && media && !mediaError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
              <PlayCircle className="w-8 h-8 text-white/40 group-hover:text-white/80 transition-all scale-90 group-hover:scale-100" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-grow min-w-0 flex flex-col justify-center space-y-2 text-left w-full">
          <h3 className="text-sm font-black text-white tracking-tight leading-tight group-hover:text-blue-300 transition-colors break-words font-display">
            {exercise.cleanName.toUpperCase()}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 rounded-xl border border-white/5">
              <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-[0.2em] font-display">Sets</span>
              <span className="text-sm font-black text-white/90">{exercise.sets}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 rounded-xl border border-white/5">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] font-display">Reps</span>
              <span className="text-sm font-black text-white/90">
                {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''}
              </span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
