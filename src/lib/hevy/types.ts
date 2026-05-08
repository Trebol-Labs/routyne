// Hevy Public API v1 response types
// Reference: https://api.hevyapp.com/docs

export type HevySetType = 'normal' | 'warmup' | 'dropset' | 'failure';

export interface HevySet {
  index: number;
  type: HevySetType;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
}

export interface HevyExercise {
  index: number;
  title: string;
  notes: string | null;
  exercise_template_id: string;
  superset_id: number | null;
  sets: HevySet[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  description: string | null;
  start_time: string;   // ISO 8601
  end_time: string;     // ISO 8601
  updated_at: string;   // ISO 8601
  created_at: string;   // ISO 8601
  exercises: HevyExercise[];
}

export interface HevyWorkoutsPage {
  page: number;
  page_count: number;
  workouts: HevyWorkout[];
}
