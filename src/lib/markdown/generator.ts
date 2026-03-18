/**
 * Markdown Generator
 * Converts RoutineData back to Markdown format compatible with the parser.
 */

import type { RoutineData, ParsedExercise } from '@/types/workout';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatExerciseLine(ex: ParsedExercise): string {
  const repsStr =
    ex.repsMin === ex.repsMax ? String(ex.repsMin) : `${ex.repsMin}-${ex.repsMax}`;
  const rest = ex.restSeconds !== 90 ? ` ${ex.restSeconds}s` : '';
  const notes = ex.notes ? `  *(${ex.notes})*` : '';
  return `* **${ex.cleanName}**: ${ex.sets}x${repsStr}${rest}${notes}`;
}

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Convert RoutineData to a Markdown string.
 * Output is compatible with parseRoutine() — round-trip safe.
 */
export function generateMarkdown(routine: RoutineData): string {
  const lines: string[] = [];

  lines.push(`# ${routine.title}`);
  lines.push('');

  for (const session of routine.sessions) {
    lines.push(`## ${session.title}`);
    lines.push('');

    for (const exercise of session.exercises) {
      lines.push(formatExerciseLine(exercise));
    }

    lines.push('');
  }

  // Trim trailing empty lines
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n') + '\n';
}
