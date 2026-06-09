export const COACH_ENABLED = process.env.NEXT_PUBLIC_COACH_ENABLED === 'true';

// Nutrition coach + onboarding wizard. Defaults ON so new users get the flow;
// set NEXT_PUBLIC_NUTRITION_ENABLED=false to disable.
export const NUTRITION_ENABLED = process.env.NEXT_PUBLIC_NUTRITION_ENABLED !== 'false';

// Temporary toggle for the nutrition coach/planner block inside the nutrition view.
// Leave disabled by default so the section stays hidden until it is ready again.
export const NUTRITION_COACH_ENABLED = process.env.NEXT_PUBLIC_NUTRITION_COACH_ENABLED === 'true';
