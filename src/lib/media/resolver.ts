/**
 * Converts a raw exercise name into a stable API slug path.
 * The actual media resolution happens at runtime in /api/media/[slug].
 *
 * Example: resolveExerciseMedia("Barbell Squat") -> "/api/media/barbell-squat"
 */
export function resolveExerciseMedia(rawName: string): string | null {
  if (!rawName.trim()) return null;
  const slug = rawName.trim().toLowerCase().replace(/\s+/g, '-');
  return `/api/media/${slug}`;
}
