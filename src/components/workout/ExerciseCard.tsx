'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ParsedExercise } from '@/types/workout';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell, PlayCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaResult } from '@/lib/media/providers';

interface ExerciseCardProps {
  exercise: ParsedExercise;
  index: number;
}

export function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const [media, setMedia] = React.useState<MediaResult | null>(null);
  const [mediaLoaded, setMediaLoaded] = React.useState(false);
  const [mediaError, setMediaError] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    if (!exercise.mediaUrl) return;
    fetch(exercise.mediaUrl)
      .then(r => r.ok ? r.json() : null)
      .then((data: MediaResult | null) => setMedia(data))
      .catch(() => setMediaError(true));
  }, [exercise.mediaUrl]);

  const showFallback = mediaError || (!media && !exercise.mediaUrl);
  const isVideo = media?.type === 'video';
  const isGif = media?.type === 'gif' || media?.type === 'image';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full"
    >
      <div className="absolute inset-0 bg-blue-500/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="relative glass-panel rounded-[2.5rem] overflow-hidden p-5 sm:p-6 transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05] shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-6">

        {/* Media Section */}
        <div
          className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-black/40 overflow-hidden shrink-0 border border-white/10 shadow-inner group-hover:scale-[1.03] transition-transform duration-700 mx-auto sm:mx-0"
          onMouseEnter={() => setIsPlaying(true)}
          onMouseLeave={() => setIsPlaying(false)}
        >
          {!mediaLoaded && !showFallback && (
            <Skeleton className="absolute inset-0 w-full h-full bg-white/5" />
          )}

          {showFallback && (
            <div className="w-full h-full flex items-center justify-center text-white/30">
              <Dumbbell className="w-12 h-12" />
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
              onLoad={() => setMediaLoaded(true)}
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
        <div className="flex-grow min-w-0 flex flex-col justify-center space-y-3 text-left w-full">
          <div className="flex items-start justify-between gap-3 w-full">
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-tight group-hover:text-blue-400 transition-colors break-words">
              {exercise.cleanName.toUpperCase()}
            </h3>
            <button
              className="hidden sm:block text-white/10 hover:text-white transition-all shrink-0 mt-1"
              title="More info"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/[0.03] shadow-inner">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em]">Sets</span>
              <span className="text-base font-black text-white/90">{exercise.sets}</span>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/[0.03] shadow-inner">
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.25em]">Reps</span>
              <span className="text-base font-black text-white/90">
                {exercise.repsMin}{exercise.repsMin !== exercise.repsMax ? `-${exercise.repsMax}` : ''}
              </span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
