export type TrainingSplit =
  | 'ppl'
  | 'upper_lower'
  | 'full_body'
  | 'push_pull'
  | 'no_preference';

export interface FitnessProfile {
  trainingSplit: TrainingSplit | null;
  isPowerlifter: boolean;
  hasHevyBackground: boolean;
  mainLiftsSummary: string | null;
  createdAt: string;
  updatedAt: string;
}
