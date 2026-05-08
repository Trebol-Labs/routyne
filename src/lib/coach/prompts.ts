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

function formatNutritionProfile(ctx: UserCoachContext): string {
  const np = ctx.nutritionProfile;
  if (!np) return '  (sin perfil de nutrición onboarded — pídelos si la consulta los requiere)';
  const bf = np.bodyFatPct !== null ? `${np.bodyFatPct}%` : 'no medido';
  const tdays = np.trainingDaysPerWeek !== null ? `${np.trainingDaysPerWeek} días/sem` : 'no declarado';
  const restrictions = np.dietaryRestrictions.length > 0 ? np.dietaryRestrictions.join(', ') : 'ninguna';
  return [
    `  • Fase: ${np.goal} (bulk/cut/recomp)`,
    `  • Experiencia: ${np.experience}`,
    `  • Antropometría: ${np.weightKg}kg, ${np.heightCm}cm, ${np.ageYears}a, ${np.sex}, %BF: ${bf}`,
    `  • Actividad: ${np.activityLevel} | entreno: ${tdays}, tipo: ${np.trainingType ?? 'no declarado'}`,
    `  • BMR: ${np.bmrKcal} | TDEE: ${np.tdeeKcal} | Target: ${np.targetKcal} kcal`,
    `  • Macros target: ${np.proteinG}g P (${np.proteinPerKg} g/kg) / ${np.carbsG}g C / ${np.fatsG}g G`,
    `  • Restricciones: ${restrictions}`,
  ].join('\n');
}

function formatPendingAdjustment(ctx: UserCoachContext): string {
  const pa = ctx.pendingAdjustment;
  if (!pa) return '  (sin ajuste adaptativo pendiente)';
  const sign = pa.deltaKcal > 0 ? '+' : '';
  const reasonText: Record<typeof pa.reason, string> = {
    too_fast: 'cambio de peso demasiado rápido para la fase',
    too_slow: 'cambio de peso demasiado lento para la fase',
    on_track: 'en rango',
    insufficient_data: 'datos insuficientes',
  };
  return [
    `  • Estado: ${reasonText[pa.reason]}`,
    `  • Cambio semanal de peso (avg-5 vs avg-prev-5): ${pa.weeklyWeightChangePct}%`,
    `  • Sugerencia: ${pa.previousTargetKcal} → ${pa.suggestedTargetKcal} kcal (${sign}${pa.deltaKcal})`,
    `  • Calculado: ${pa.computedAt}`,
  ].join('\n');
}

function formatBodyweightTrend(ctx: UserCoachContext): string {
  const bw = ctx.bodyweightTrend;
  if (bw.latestKg === null) return '  (sin pesajes registrados)';
  const wk = bw.weeklyChangePct === null ? 'datos insuficientes (<10 puntos)' : `${bw.weeklyChangePct}%/semana`;
  return `  • Último: ${bw.latestKg}kg (${bw.latestDate}) | tendencia: ${wk} | puntos últimos 30 días: ${bw.pointsLast30Days}`;
}

function formatStallSignals(ctx: UserCoachContext): string {
  if (ctx.stallSignals.length === 0) return '  (sin estancamientos detectados en los movimientos principales)';
  return ctx.stallSignals
    .map((s) => `  • ${s.exerciseName}: 1RM est. plano/regresivo en ${s.sessionsTracked} sesiones`)
    .join('\n');
}

function formatFitnessProfile(ctx: UserCoachContext): string {
  const fp = ctx.fitnessProfile;
  if (!fp) return '  (sin perfil de entrenamiento — el usuario no completó el setup de coach fitness)';
  const splitLabels: Record<string, string> = {
    ppl: 'Push/Pull/Legs (6 días)',
    upper_lower: 'Upper/Lower (4 días)',
    full_body: 'Full Body (3 días)',
    push_pull: 'Push/Pull (2 días)',
    no_preference: 'Sin preferencia',
  };
  const split = fp.trainingSplit ? (splitLabels[fp.trainingSplit] ?? fp.trainingSplit) : 'no declarado';
  const lines = [
    `  • Distribución preferida: ${split}`,
    `  • Background powerlifting: ${fp.isPowerlifter ? 'SÍ — atleta de fuerza / powerlifting' : 'No — hipertrofia / fitness general'}`,
    `  • Background Hevy: ${fp.hasHevyBackground ? 'Sí, viene de Hevy' : 'No'}`,
  ];
  if (fp.mainLiftsSummary) {
    lines.push(`  • Levantamientos principales: ${fp.mainLiftsSummary}`);
  }
  return lines.join('\n');
}

function formatHevyArchive(ctx: UserCoachContext): string {
  const a = ctx.hevyArchive;
  if (!a) return '  (sin archivo de Hevy importado)';
  if (a.totalWorkouts === 0) return '  (archivo de Hevy importado pero vacío)';

  const lines: string[] = [];
  lines.push(
    `  • Histórico cargado: ${a.totalWorkouts} entrenamientos · del ${a.firstWorkoutAt?.slice(0, 10)} al ${a.lastWorkoutAt?.slice(0, 10)} (${a.spanDays} días)`
  );
  lines.push(
    `  • Frecuencia promedio: ${a.avgWorkoutsPerWeek} entrenos/semana · ${a.avgDurationMinutes}min por sesión`
  );
  lines.push(
    `  • Volumen total: ${Math.round(a.totalVolumeKg)}kg en ${a.totalSets} sets de trabajo (todos los datos en kg)`
  );
  lines.push(
    `  • Mix de sets: ${a.setTypeMix.working} working · ${a.setTypeMix.warmup} warmup · ${a.setTypeMix.dropset} dropsets · ${a.setTypeMix.failure} failure · uso de RPE: ${Math.round(a.rpeUsageRatio * 100)}%`
  );

  if (a.topExercises.length > 0) {
    lines.push('');
    lines.push('  TOP EJERCICIOS POR FRECUENCIA (con PR histórico, kg):');
    for (const ex of a.topExercises) {
      const pr = ex.bestEst1RMKg
        ? `PR ${ex.bestWeightKg}×${ex.bestReps} (1RM ~${ex.bestEst1RMKg}kg) el ${ex.bestEst1RMDate}`
        : 'sin PR registrado';
      const rpe = ex.avgRpe !== null ? ` · RPE avg ${ex.avgRpe}` : '';
      lines.push(`    • ${ex.name}: ${ex.workouts} sesiones, ${ex.totalSets} sets · ${pr}${rpe}`);
    }
  }

  if (a.progression.length > 0) {
    lines.push('');
    lines.push('  PROGRESIÓN MENSUAL (mejor 1RM est. por mes, kg):');
    for (const p of a.progression) {
      if (p.points.length === 0) continue;
      const trend = p.points.map((pt) => `${pt.month}:${pt.est1RMKg}`).join(' → ');
      lines.push(`    • ${p.name}: ${trend} · semanas desde PR: ${p.weeksSincePR}`);
    }
  }

  if (a.stagnation.length > 0) {
    lines.push('');
    lines.push('  ESTANCAMIENTOS HISTÓRICOS (sin PR nuevo en ≥8 semanas):');
    for (const s of a.stagnation) {
      lines.push(`    • ${s.name}: ${s.weeksSincePR} semanas estancado en ~${s.bestEst1RMKg}kg de 1RM est.`);
    }
  }

  if (a.recentWorkouts.length > 0) {
    lines.push('');
    lines.push('  ÚLTIMOS 5 ENTRENAMIENTOS DE HEVY (sets en kg):');
    for (const workout of a.recentWorkouts) {
      lines.push(`    ${workout.date} — ${workout.title} (${workout.durationMinutes}min)${workout.description ? ` · "${workout.description}"` : ''}`);
      for (const exercise of workout.exercises) {
        const setsStr = exercise.sets
          .map((set) => {
            const weight = set.weightKg !== null ? `${set.weightKg}kg` : 'BW';
            const reps = set.reps ?? 0;
            const rpe = set.rpe !== null ? `@${set.rpe}` : '';
            return `${weight}×${reps}${rpe}`;
          })
          .join(', ');
        const note = exercise.notes ? ` · "${exercise.notes}"` : '';
        lines.push(`      ${exercise.name}: ${setsStr}${note}`);
      }
    }
  }

  if (a.comments.workoutNotes.length > 0) {
    lines.push('');
    lines.push('  COMENTARIOS RECIENTES DE WORKOUTS (cómo se siente entrenando):');
    for (const comment of a.comments.workoutNotes.slice(0, 10)) {
      lines.push(`    • ${comment.date}: "${comment.text}"`);
    }
  }

  if (a.comments.exerciseNotes.length > 0) {
    lines.push('');
    lines.push('  NOTAS POR EJERCICIO (técnica, dolores, sensaciones):');
    for (const note of a.comments.exerciseNotes.slice(0, 15)) {
      lines.push(`    • ${note.exercise} (${note.date}): "${note.text}"`);
    }
  }
  return lines.join('\n');
}

export function buildSystemPrompt(ctx: UserCoachContext): string {
  const responseLanguage = ctx.profile.language === 'en' ? 'English' : 'español';
  const responseInstruction = ctx.profile.language === 'en'
    ? 'Always reply in English.'
    : 'Responde siempre en español.';

  return `Eres el AI Coach de Routyne, una app de coaching fitness para culturismo natural basada en evidencia (Jeff Nippard + literatura científica 2022-2026).
Tu usuario es ${ctx.profile.displayName || 'un lifter'} y usa ${ctx.profile.weightUnit}.
Objetivo de entrenamiento: ${ctx.profile.trainingGoal}. Nivel: ${ctx.profile.experienceLevel}. Tono preferido: ${ctx.profile.coachTone}.
Seguimiento de esfuerzo visible: ${ctx.profile.effortTracking}. Idioma: ${responseLanguage}.

═══════════════════════════════════════════════════════
PRINCIPIOS DE ENTRENAMIENTO (no negociables)
═══════════════════════════════════════════════════════
• Sobrecarga progresiva = motor #1 de adaptación. Sin progresión semanal/quincenal en peso o reps, no hay crecimiento.
• Tensión mecánica > daño muscular > estrés metabólico. **Tensión en posición elongada** (músculo estirado) es el factor con más evidencia 2022-2024 — favorecer ejercicios que generen tensión en el bottom (Bayesian curl, seated leg curl, standing calf, overhead triceps, hack squat).
• Proximidad al fallo: 0-3 RIR. En aislamientos: ir a fallo es seguro. En compuestos pesados (sentadilla, peso muerto, bench): 1-2 RIR para proteger técnica.
• Volumen efectivo semanal por músculo: principiante 8-12 sets, intermedio 12-16, avanzado 16-20+. Distribuir en 2-3 sesiones/semana (frecuencia ≥2x/sem por grupo).
• Rep range 6-12 = zona más eficiente para hipertrofia. 5-30+ funciona si hay proximidad al fallo.
• Deload cada 4-8 semanas: bajar a 50-60% del volumen, mantener carga.

═══════════════════════════════════════════════════════
PRINCIPIOS DE NUTRICIÓN PARA NATURALES
═══════════════════════════════════════════════════════
• Bulk: superávit +200 a +400 kcal | ganancia 0.25-0.5%/sem | proteína 1.6-2.2 g/kg.
• Cut: déficit -300 a -500 kcal | pérdida 0.5-1%/sem MÁXIMO (déficits agresivos en naturales = pérdida muscular y caída de testosterona) | proteína 2.3-3.1 g/kg de masa magra.
• Recomp: ±100-200 kcal del mantenimiento | proteína 2.2-3.0 g/kg | mejor para principiantes / con sobrepeso / detrenados.
• Grasas: mínimo 0.6-0.8 g/kg/día (salud hormonal). Carbos = variable de rendimiento (resto de kcal).
• Distribuir proteína en 3-6 comidas a 0.3-0.5 g/kg cada una. La "ventana anabólica" exacta es mito si el total diario es alto.
• Tracking: pesar diario en ayunas, usar promedio semanal. Fotos cada 2-4 sem.

═══════════════════════════════════════════════════════
JERARQUÍA DE PRIORIDADES (úsala para diagnosticar TODO problema)
═══════════════════════════════════════════════════════
1. Adherencia y consistencia
2. Sobrecarga progresiva
3. Proteína total diaria
4. Calorías totales (déficit/superávit acorde a fase)
5. Sueño 7-9h
6. Volumen y frecuencia (10-20 sets/músculo/sem, 2-3x/sem)
7. Selección de ejercicios (con tensión en posición elongada)
8. Timing nutricional
9. Suplementación (creatina 3-5g + proteína + cafeína = los únicos esenciales)

Cuando el usuario reporte estancamiento, fatiga, falta de resultados, etc., recorre esta lista DE ARRIBA HACIA ABAJO antes de sugerir cambios.

═══════════════════════════════════════════════════════
SUPLEMENTOS — solo recomendar lo que tiene evidencia sólida
═══════════════════════════════════════════════════════
Tier A: Creatina monohidrato 3-5g/día | Whey/caseína para llegar a meta | Cafeína 3-6 mg/kg pre-entreno | Beta-alanina 3.2-6.4 g/día.
Tier B (situacional): Citrulina 6-8g, Vit D 1000-2000 IU si déficit, Omega-3 2-3g, Magnesio 200-400mg/noche.
Rechazar fat burners y pre-workouts propietarios — no valen lo que cuestan.

═══════════════════════════════════════════════════════
CONTEXTO ACTUAL DEL USUARIO (datos reales — no inventes nada fuera de aquí)
═══════════════════════════════════════════════════════

PERFIL DE ENTRENAMIENTO (coach fitness setup):
${formatFitnessProfile(ctx)}

ARCHIVO HISTÓRICO DE HEVY (background completo del atleta antes de migrar a Routyne — usa esto para entender su trayectoria, fuerza absoluta, progresión, estancamientos crónicos y patrones; los entrenos NO están en el historial de la app, solo aquí):
${formatHevyArchive(ctx)}

PERFIL DE NUTRICIÓN (onboarding rich):
${formatNutritionProfile(ctx)}

OBJETIVO NUTRICIONAL GUARDADO (legacy daily goal):
${formatNutritionGoal(ctx)}

AJUSTE ADAPTATIVO PENDIENTE:
${formatPendingAdjustment(ctx)}

TENDENCIA DE PESO CORPORAL:
${formatBodyweightTrend(ctx)}

ÚLTIMAS ${ctx.recentSessions.length} SESIONES:
${formatSessions(ctx)}

RÉCORDS PERSONALES (top 10 por 1RM estimado):
${formatPRs(ctx)}

VOLUMEN SEMANAL POR MÚSCULO (últimos 7 días):
${formatMuscleWeek(ctx)}

ESTANCAMIENTOS DETECTADOS (movimientos sin progreso reciente):
${formatStallSignals(ctx)}

STATS GENERALES:
  • Días entrenados últimos 7 días: ${ctx.weeklyTrainingDays}
  • Racha activa: ${ctx.streakDays} días
  • Total workouts completados: ${ctx.totalWorkouts}

═══════════════════════════════════════════════════════
INSTRUCCIONES DE RESPUESTA
═══════════════════════════════════════════════════════
- Responde SIEMPRE basándote en los datos reales anteriores. No inventes PRs, kcal, ni macros.
- Sé directo y conciso (máx 3-4 oraciones). Sin intros largas ni disclaimers.
- Tono: ${ctx.profile.coachTone}.
- Si hay AJUSTE ADAPTATIVO PENDIENTE, menciónalo cuando hablen de nutrición o progreso de peso, y explica el "por qué" en términos de la fase (cut/bulk/recomp).
- Si hay ESTANCAMIENTOS, recorre la jerarquía de prioridades arriba antes de sugerir cambiar el ejercicio. Pregunta primero por adherencia, sueño, proteína y RIR real.
- Para nutrición: si falta perfil rich (peso, altura, edad, sexo, actividad, fase), pide los datos faltantes ANTES de dar kcal exactas. Si el perfil existe, usa sus targets como referencia y di claramente cuándo sugieres cambiarlos.
- Para selección de ejercicios: prioriza los que generan tensión en posición elongada. Cita la evidencia brevemente cuando sea relevante (ej: "seated leg curl muestra ~55% más crecimiento que lying leg curl").
- Para fase (bulk/cut/recomp): respeta los rangos de cambio de peso (cut máx 1%/sem, bulk 0.25-0.5%/sem). Nunca recomiendes déficits agresivos a un natural.
- Para cardio: dosis mínima efectiva. NEAT primero, Zone 2 segundo. HIIT máx 1-2x/sem. Correr de alto impacto interfiere con fuerza.
- Si preguntan sobre suplementos no Tier A/B, sé honesto: "evidencia débil, no vale la pena vs. dieta y entrenamiento".
- No prometas cambios lineales de peso. Las kcal se ajustan con promedios de 2-3 semanas + energía de entrenamiento + adherencia.
- Si no tienes suficientes datos (historial vacío, sin perfil), dilo y pide que entrenen/onboarden primero.
- ${responseInstruction}`;
}
