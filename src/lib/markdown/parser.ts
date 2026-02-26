import { v4 as uuidv4 } from 'uuid';
import { RoutineData, WorkoutSession, ParsedExercise } from '@/types/workout';
import { resolveExerciseMedia } from '@/lib/media/resolver';

/**
 * Parses a complex multi-session markdown workout routine into structured data.
 * Designed to be highly resilient against different gym-goer notation.
 */
export function parseRoutine(markdown: string): RoutineData {
  const lines = markdown.split('\n');
  const sessions: WorkoutSession[] = [];
  let currentSession: WorkoutSession | null = null;
  let overallTitle = "My Workout";

  // Regex for overall title (H1)
  const h1Regex = /^#\s+(.+)$/;
  
  // Regex for session title (H2)
  const h2Regex = /^##\s+(.+)$/;

  // Regex to detect exercise lines with sets/reps:
  // - "Exercise Name 3x8-10"
  // - "* Exercise Name: 3x10"
  // - "**Exercise**: 3x12 60s"
  // - "3x12 Bench Press" (flipped style)
  const exercisePattern = {
    // Basic: Name: Sets x Reps-MaxRest (e.g. "Bench Press: 3x8-10 90s")
    standard: /^(?:\*|-|\d+\.)?\s*(?:\*\*)?(.+?)(?:\*\*)?[:\-]?\s*(\d+)\s*[xX]\s*(\d+)(?:-(\d+))?\s*(?:(\d+)\s*s|reps?\.?)?/,
    // Flipped: Sets x Reps Name (e.g. "3x10 Bicep Curls")
    flipped: /^(?:\*|-|\d+\.)?\s*(\d+)\s*[xX]\s*(\d+)(?:-(\d+))?\s*(?:\*\*)?(.+?)(?:\*\*)?$/
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // 1. Overall Title (H1)
    const h1Match = trimmedLine.match(h1Regex);
    if (h1Match && sessions.length === 0) {
      overallTitle = h1Match[1].trim();
      continue;
    }

    // 2. Capture Sessions (H2)
    const h2Match = trimmedLine.match(h2Regex);
    if (h2Match) {
      if (currentSession) sessions.push(currentSession);
      currentSession = {
        id: uuidv4(),
        title: h2Match[1].trim(),
        exercises: [],
      };
      continue;
    }

    // 3. Capture Exercises
    if (currentSession) {
      // Try standard pattern
      let match = trimmedLine.match(exercisePattern.standard);
      if (match) {
        const cleanName = match[1].trim();
        const sets = parseInt(match[2], 10);
        const repsMin = parseInt(match[3], 10);
        const repsMax = match[4] ? parseInt(match[4], 10) : repsMin;
        const restSeconds = match[5] ? parseInt(match[5], 10) : 90; // Default 90s rest

        if (isNaN(sets) || sets <= 0 || isNaN(repsMin) || repsMin <= 0) continue;

        currentSession.exercises.push({
          id: uuidv4(),
          originalName: trimmedLine,
          cleanName,
          sets,
          repsMin,
          repsMax,
          restSeconds,
          mediaUrl: resolveExerciseMedia(cleanName),
        });
        continue;
      }

      // Try flipped pattern
      match = trimmedLine.match(exercisePattern.flipped);
      if (match) {
        const sets = parseInt(match[1], 10);
        const repsMin = parseInt(match[2], 10);
        const repsMax = match[3] ? parseInt(match[3], 10) : repsMin;
        const cleanName = match[4].trim();

        if (isNaN(sets) || sets <= 0 || isNaN(repsMin) || repsMin <= 0) continue;

        currentSession.exercises.push({
          id: uuidv4(),
          originalName: trimmedLine,
          cleanName,
          sets,
          repsMin,
          repsMax,
          restSeconds: 90,
          mediaUrl: resolveExerciseMedia(cleanName),
        });
      }
    }
  }

  if (currentSession) sessions.push(currentSession);

  return {
    id: uuidv4(),
    title: overallTitle,
    sessions,
    createdAt: new Date(),
  };
}
