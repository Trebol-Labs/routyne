import { describe, it, expect } from 'vitest';
import { parseRoutine } from './parser';

describe('parseRoutine Markdown Parser', () => {
  const exampleMarkdown = `
## Día 1: PUSH (Pecho, Hombro, Tríceps)
* **Press Inclinado en Máquina Smith**: 3 x 8-10 reps.
* **Pec Deck (Aperturas en máquina)**: 2 x 10-12 reps.
  `;

  it('should parse session title correctly', () => {
    const result = parseRoutine(exampleMarkdown);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].title).toBe('Día 1: PUSH (Pecho, Hombro, Tríceps)');
  });

  it('should parse exercises and extract sets/reps correctly', () => {
    const result = parseRoutine(exampleMarkdown);
    const exercises = result.sessions[0].exercises;

    expect(exercises).toHaveLength(2);

    // Press Inclinado en Máquina Smith
    expect(exercises[0].cleanName).toBe('Press Inclinado en Máquina Smith');
    expect(exercises[0].sets).toBe(3);
    expect(exercises[0].repsMin).toBe(8);
    expect(exercises[0].repsMax).toBe(10);

    // Pec Deck (Aperturas en máquina)
    expect(exercises[1].cleanName).toBe('Pec Deck (Aperturas en máquina)');
    expect(exercises[1].sets).toBe(2);
    expect(exercises[1].repsMin).toBe(10);
    expect(exercises[1].repsMax).toBe(12);
  });

  it('should resolve media URLs if found in fuzzy search', () => {
    // Note: Since resolveExerciseMedia uses our local exercises.json, 
    // it depends on what's in there. We know "sentadillas" (Squats) is in there.
    const squatMarkdown = `
## Día 2: LEGS
* **Sentadillas**: 4 x 10 reps.
    `;
    const result = parseRoutine(squatMarkdown);
    const exercise = result.sessions[0].exercises[0];
    
    expect(exercise.cleanName).toBe('Sentadillas');
    // Resolver now emits /api/media/{slug} — actual GIF resolved at runtime
    expect(exercise.mediaUrl).toBe('/api/media/sentadillas');
  });

  it('should parse flipped format (sets x reps name)', () => {
    const flippedMarkdown = `
## Day 1
3x10 Bicep Curls
    `;
    const result = parseRoutine(flippedMarkdown);
    const ex = result.sessions[0].exercises[0];
    expect(ex.cleanName).toBe('Bicep Curls');
    expect(ex.sets).toBe(3);
    expect(ex.repsMin).toBe(10);
    expect(ex.repsMax).toBe(10);
  });

  it('should skip exercise lines with non-numeric sets/reps', () => {
    const nanMarkdown = `
## Day 1
* **Exercise**: notanumber
* **Valid**: 3 x 10 reps
    `;
    const result = parseRoutine(nanMarkdown);
    expect(result.sessions[0].exercises).toHaveLength(1);
    expect(result.sessions[0].exercises[0].cleanName).toBe('Valid');
  });

  it('should return empty sessions array for empty string input', () => {
    const result = parseRoutine('');
    expect(result.sessions).toHaveLength(0);
  });

  it('should return empty sessions array when there are no H2 headings', () => {
    const result = parseRoutine('# Just a title\nSome random text\n* **Exercise**: 3x10');
    expect(result.sessions).toHaveLength(0);
  });

  it('should be defensive against malformed lines', () => {
    const messyMarkdown = `
Random text line.
## Día 1: PUSH
* Missing bold and colon
* **Broken line**: no sets or reps
* **Valid**: 3 x 15 reps
    `;
    const result = parseRoutine(messyMarkdown);
    expect(result.sessions[0].exercises).toHaveLength(1);
    expect(result.sessions[0].exercises[0].cleanName).toBe('Valid');
  });
});
