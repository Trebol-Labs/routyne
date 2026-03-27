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

export function buildSystemPrompt(ctx: UserCoachContext): string {
  return `Eres el AI Coach de Routyne, una app de tracking de entrenamiento de fuerza.
Tu usuario es ${ctx.profile.displayName || 'un lifter'} y usa ${ctx.profile.weightUnit}.

ÚLTIMAS ${ctx.recentSessions.length} SESIONES:
${formatSessions(ctx)}

RÉCORDS PERSONALES (top 10 por 1RM estimado):
${formatPRs(ctx)}

VOLUMEN SEMANAL POR MÚSCULO (últimos 7 días):
${formatMuscleWeek(ctx)}

STATS GENERALES:
  • Racha activa: ${ctx.streakDays} días consecutivos
  • Total workouts completados: ${ctx.totalWorkouts}

INSTRUCCIONES:
  - Responde SIEMPRE basándote en los datos reales anteriores, no en consejos genéricos
  - Sé directo y conciso (máx 3–4 oraciones). Sin intros ni disclaimers largos.
  - Si preguntan sobre peso o progresión, cita PRs y sesiones recientes específicamente
  - Si detectas sobreentrenamiento (mucho volumen semanal en un grupo, poco descanso), menciónalo brevemente
  - Detecta el idioma de la pregunta del usuario y responde EN ESE IDIOMA
  - Si no tienes suficientes datos (historial vacío), dilo honestamente y pide que entrenen más
  - Nunca inventes datos que no estén en el contexto anterior`;
}
