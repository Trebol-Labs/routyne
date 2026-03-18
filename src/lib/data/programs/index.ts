/**
 * Program Template Library
 * Pre-built training programs ready to import.
 */

export interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: number;
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'general';
  markdown: string;
}

const PPL: ProgramTemplate = {
  id: 'ppl',
  name: 'Push Pull Legs',
  description: 'Classic 6-day hypertrophy split. High volume, intermediate-advanced.',
  level: 'intermediate',
  daysPerWeek: 6,
  goal: 'hypertrophy',
  markdown: `# Push Pull Legs

## Push A — Chest & Shoulders

* **Bench Press**: 4x6-8 180s
* **Overhead Press**: 3x8-10 120s
* **Incline Dumbbell Press**: 3x10-12 90s
* **Cable Lateral Raise**: 4x12-15 60s
* **Tricep Pushdown**: 3x12-15 60s
* **Overhead Tricep Extension**: 3x10-12 60s

## Pull A — Back & Biceps

* **Deadlift**: 3x5 180s
* **Barbell Row**: 4x6-8 120s
* **Lat Pulldown**: 3x10-12 90s
* **Cable Row**: 3x10-12 90s
* **Face Pull**: 4x15-20 60s
* **Barbell Curl**: 3x10-12 60s
* **Hammer Curl**: 3x12-15 60s

## Legs A — Quads Focus

* **Squat**: 4x6-8 180s
* **Romanian Deadlift**: 3x8-10 120s
* **Leg Press**: 3x10-12 90s
* **Leg Extension**: 3x12-15 60s
* **Leg Curl**: 3x10-12 60s
* **Standing Calf Raise**: 5x10-12 60s

## Push B — Shoulders Focus

* **Overhead Press**: 4x6-8 180s
* **Bench Press**: 3x8-10 120s
* **Dumbbell Lateral Raise**: 4x12-15 60s
* **Cable Fly**: 3x12-15 60s
* **Skullcrusher**: 3x10-12 60s
* **Tricep Dip**: 3x10-12 90s

## Pull B — Width Focus

* **Pull-Up**: 4x6-10 120s
* **Cable Row**: 4x10-12 90s
* **Chest-Supported Row**: 3x10-12 90s
* **Straight-Arm Pulldown**: 3x12-15 60s
* **Incline Dumbbell Curl**: 3x12-15 60s
* **Reverse Curl**: 3x12-15 60s

## Legs B — Posterior Focus

* **Romanian Deadlift**: 4x6-8 180s
* **Leg Curl**: 4x10-12 90s
* **Squat**: 3x8-10 120s
* **Leg Press**: 3x12-15 90s
* **Glute Bridge**: 3x12-15 60s
* **Seated Calf Raise**: 4x12-15 60s
`,
};

const STARTING_STRENGTH: ProgramTemplate = {
  id: 'starting-strength',
  name: 'Starting Strength',
  description: 'The classic beginner barbell program. 3 days/week, linear progression.',
  level: 'beginner',
  daysPerWeek: 3,
  goal: 'strength',
  markdown: `# Starting Strength

## Workout A

* **Squat**: 3x5 180s
* **Bench Press**: 3x5 180s
* **Deadlift**: 1x5 240s

## Workout B

* **Squat**: 3x5 180s
* **Overhead Press**: 3x5 180s
* **Power Clean**: 5x3 180s
`,
};

const FIVE_THREE_ONE: ProgramTemplate = {
  id: '531',
  name: '5/3/1 Wendler',
  description: '4-week cycles targeting the big 4 lifts. Intermediate strength builder.',
  level: 'intermediate',
  daysPerWeek: 4,
  goal: 'strength',
  markdown: `# 5/3/1 Wendler

## Press Day

* **Overhead Press**: 3x5 180s
* **Dumbbell Row**: 5x10 60s
* **Dips**: 3x10-15 90s
* **Dumbbell Curl**: 3x10-12 60s
* **Face Pull**: 3x15-20 60s

## Deadlift Day

* **Deadlift**: 3x5 240s
* **Leg Press**: 3x10-15 90s
* **Leg Curl**: 3x10-12 60s
* **Hanging Leg Raise**: 3x10-15 60s
* **Back Extension**: 3x10-15 60s

## Bench Press Day

* **Bench Press**: 3x5 180s
* **Dumbbell Row**: 5x10 60s
* **Incline Dumbbell Press**: 3x10-12 90s
* **Tricep Pushdown**: 3x10-15 60s
* **Cable Lateral Raise**: 3x15-20 60s

## Squat Day

* **Squat**: 3x5 180s
* **Romanian Deadlift**: 3x10-12 120s
* **Leg Press**: 3x10-15 90s
* **Leg Curl**: 3x10-12 60s
* **Standing Calf Raise**: 3x10-15 60s
`,
};

const UPPER_LOWER: ProgramTemplate = {
  id: 'upper-lower',
  name: 'Upper/Lower Split',
  description: '4-day split combining strength and hypertrophy. Great for intermediates.',
  level: 'intermediate',
  daysPerWeek: 4,
  goal: 'hypertrophy',
  markdown: `# Upper/Lower Split

## Upper Power

* **Bench Press**: 4x4-6 180s
* **Barbell Row**: 4x4-6 180s
* **Overhead Press**: 3x6-8 120s
* **Lat Pulldown**: 3x8-10 90s
* **Incline Dumbbell Press**: 3x8-10 90s
* **Face Pull**: 3x15-20 60s

## Lower Power

* **Squat**: 4x4-6 180s
* **Romanian Deadlift**: 3x8-10 120s
* **Leg Press**: 3x10-12 90s
* **Leg Curl**: 3x10-12 60s
* **Standing Calf Raise**: 4x8-12 60s

## Upper Hypertrophy

* **Incline Bench Press**: 4x8-12 90s
* **Cable Row**: 4x10-12 90s
* **Dumbbell Shoulder Press**: 3x10-12 90s
* **Cable Pullover**: 3x12-15 60s
* **Pec Deck**: 3x12-15 60s
* **Lateral Raise**: 4x12-15 60s
* **Tricep Pushdown**: 3x12-15 60s
* **Barbell Curl**: 3x12-15 60s

## Lower Hypertrophy

* **Squat**: 3x8-12 120s
* **Deadlift**: 3x8-10 180s
* **Leg Extension**: 3x12-15 60s
* **Leg Curl**: 3x12-15 60s
* **Hip Thrust**: 3x10-12 90s
* **Seated Calf Raise**: 4x12-15 60s
`,
};

const ARNOLD_SPLIT: ProgramTemplate = {
  id: 'arnold-split',
  name: 'Arnold Split',
  description: 'High-volume 6-day split combining chest/back and shoulders/arms.',
  level: 'advanced',
  daysPerWeek: 6,
  goal: 'hypertrophy',
  markdown: `# Arnold Split

## Chest & Back

* **Bench Press**: 4x8-10 120s
* **Barbell Row**: 4x8-10 120s
* **Incline Bench Press**: 3x10-12 90s
* **Pull-Up**: 3x8-12 90s
* **Dumbbell Fly**: 3x12-15 60s
* **Cable Row**: 3x12-15 60s
* **Dumbbell Pullover**: 3x12-15 60s

## Shoulders & Arms

* **Overhead Press**: 4x8-10 120s
* **Barbell Curl**: 4x8-10 90s
* **Close-Grip Bench Press**: 4x8-10 90s
* **Lateral Raise**: 4x12-15 60s
* **Preacher Curl**: 3x10-12 60s
* **Skullcrusher**: 3x10-12 60s
* **Reverse Fly**: 3x12-15 60s

## Legs

* **Squat**: 4x8-10 180s
* **Romanian Deadlift**: 4x8-10 120s
* **Leg Press**: 3x12-15 90s
* **Leg Extension**: 3x12-15 60s
* **Leg Curl**: 3x12-15 60s
* **Calf Raise**: 5x15-20 60s
* **Seated Calf Raise**: 3x15-20 60s
`,
};

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  STARTING_STRENGTH,
  UPPER_LOWER,
  FIVE_THREE_ONE,
  PPL,
  ARNOLD_SPLIT,
];
