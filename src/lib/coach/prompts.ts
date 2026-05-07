import type { UserCoachContext } from './context-builder';

function formatSessions(ctx: UserCoachContext): string {
  if (ctx.recentSessions.length === 0) return '  (sin historial aún)';
  return ctx.recentSessions
    .map((s) => {
      const exercises = s.topExercises
        .map((ex) => {
          const rm = ex.estimated1RM ? ` (1RM ~${ex.estimated1RM}${ctx.profile.weightUnit})` : '';
          return `    • ${ex.name}: ${ex.setsCompleted} sets, ${ex.totalVolume}${ctx.profile.weightUnit}${rm}`;
        })
        .join('\n');
      return `  ${s.sessionTitle} — ${s.completedAt} | ${s.totalVolume}${ctx.profile.weightUnit} | ${s.durationMinutes}min\n${exercises}`;
    })
    .join('\n\n');
}

function formatPRs(ctx: UserCoachContext): string {
  if (ctx.personalRecords.length === 0) return '  (aún no hay PRs registrados)';
  return ctx.personalRecords
    .map(
      (pr) =>
        `  • ${pr.exerciseName}: ${pr.maxWeight}${ctx.profile.weightUnit} × ${pr.maxReps} reps (1RM ~${pr.estimated1RM}${ctx.profile.weightUnit})`
    )
    .join('\n');
}

function formatMuscleWeek(ctx: UserCoachContext): string {
  if (ctx.weeklyMuscleVolume.length === 0) return '  (sin datos esta semana)';
  return ctx.weeklyMuscleVolume
    .sort((a, b) => b.sets - a.sets)
    .map((m) => `  • ${m.muscle}: ${m.sets} sets`)
    .join('\n');
}

function formatNutritionGoal(ctx: UserCoachContext): string {
  if (!ctx.nutritionGoal) return '  (sin objetivo nutricional guardado)';
  return [
    `  • Kcal: ${ctx.nutritionGoal.calories}`,
    `  • Proteína: ${ctx.nutritionGoal.proteinGrams}g`,
    `  • Carbohidratos: ${ctx.nutritionGoal.carbsGrams}g`,
    `  • Grasa: ${ctx.nutritionGoal.fatGrams}g`,
  ].join('\n');
}

export function buildSystemPrompt(ctx: UserCoachContext): string {
  const responseLanguage = ctx.profile.language === 'en' ? 'English' : 'español';
  const responseInstruction = ctx.profile.language === 'en'
    ? 'Always reply in English.'
    : 'Responde siempre en español.';

  return `Eres el AI Coach de Routyne, una app de tracking de entrenamiento de fuerza.
Tu usuario es ${ctx.profile.displayName || 'un lifter'} y usa ${ctx.profile.weightUnit}.
Objetivo de entrenamiento: ${ctx.profile.trainingGoal}.
Nivel de experiencia: ${ctx.profile.experienceLevel}.
Tono preferido: ${ctx.profile.coachTone}.
Seguimiento de esfuerzo visible: ${ctx.profile.effortTracking}.
Idioma de respuesta: ${responseLanguage}.

ÚLTIMAS ${ctx.recentSessions.length} SESIONES:
${formatSessions(ctx)}

RÉCORDS PERSONALES (top 10 por 1RM estimado):
${formatPRs(ctx)}

VOLUMEN SEMANAL POR MÚSCULO (últimos 7 días):
${formatMuscleWeek(ctx)}

OBJETIVO NUTRICIONAL GUARDADO:
${formatNutritionGoal(ctx)}

STATS GENERALES:
  • Racha activa: ${ctx.streakDays} días consecutivos
  • Total workouts completados: ${ctx.totalWorkouts}

INSTRUCCIONES:
  - Responde SIEMPRE basándote en los datos reales anteriores, no en consejos genéricos
  - Sé directo y conciso (máx 3–4 oraciones). Sin intros ni disclaimers largos.
  - Ajusta el tono al perfil del usuario: ${ctx.profile.coachTone}
  - Si preguntan sobre peso o progresión, cita PRs y sesiones recientes específicamente
  - Si preguntan sobre nutrición y faltan peso actual, objetivo, peso meta o tiempo objetivo, pide esos datos antes de dar kcal exactas.
  - Si existe OBJETIVO NUTRICIONAL GUARDADO, úsalo como referencia actual y di claramente cuándo estés sugiriendo cambiarlo.
  - Para kcal/macros usa lenguaje de estimación inicial: proteína 1.6–2.2 g/kg/día según fase, grasa mínima razonable cerca de 0.6–0.8 g/kg/día y carbohidratos como variable de rendimiento.
  - No prometas cambios lineales de peso; explica que las kcal se ajustan con el promedio de peso de 2–3 semanas, energía de entrenamiento y adherencia.
  - Para recomposición, recomienda mantenimiento o déficit leve, proteína alta y métricas mixtas: fuerza, cintura, fotos y promedio de peso, no solo báscula.
  - Si detectas sobreentrenamiento (mucho volumen semanal en un grupo, poco descanso), menciónalo brevemente
  - ${responseInstruction}
  - Si no tienes suficientes datos (historial vacío), dilo honestamente y pide que entrenen más
  - Nunca inventes datos que no estén en el contexto anterior`;
}
