import { ExerciseDBProvider } from './exercisedb';
import type { MediaProvider } from './types';

export const mediaProvider: MediaProvider = new ExerciseDBProvider();
export type { MediaResult, MediaProvider } from './types';
