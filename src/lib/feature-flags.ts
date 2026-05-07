export const COACH_ENABLED = process.env.NEXT_PUBLIC_COACH_ENABLED === 'true';

// Nutrition coach + onboarding wizard. Defaults ON so new users get the flow;
// set NEXT_PUBLIC_NUTRITION_ENABLED=false to disable.
export const NUTRITION_ENABLED = process.env.NEXT_PUBLIC_NUTRITION_ENABLED !== 'false';
