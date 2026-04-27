'use client';

import type { WorkoutSummary } from '@/types/workout';
import { SITE_HOST } from '@/lib/site';

interface ShareCardProps {
  summary: WorkoutSummary;
  weightUnit: string;
}

function formatDuration(s: number): string {
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Standalone share card — designed to be captured by html-to-image.
 * Uses only inline styles so capture is hermetic (no CSS variable lookups).
 */
export function ShareCard({ summary, weightUnit }: ShareCardProps) {
  const { entry, durationSeconds, totalSets, newPRs, volumeDeltaPercent } = summary;
  const hasPRs = newPRs.length > 0;
  const topExercises = entry.volumeData.slice(0, 4);

  const card: React.CSSProperties = {
    width: 390,
    height: 520,
    background: 'radial-gradient(ellipse 110% 70% at 20% 20%, #1a1040 0%, #0a0a14 55%, #0f0a1a 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 28px 24px',
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    overflow: 'hidden',
    position: 'relative',
    boxSizing: 'border-box',
  };

  const glowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: hasPRs
      ? 'radial-gradient(circle at 80% 10%, rgba(251,191,36,0.12) 0%, transparent 50%)'
      : 'radial-gradient(circle at 80% 10%, rgba(59,130,246,0.12) 0%, transparent 50%)',
    pointerEvents: 'none',
  };

  const panelStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '12px 16px',
  };

  const statPanelStyle: React.CSSProperties = {
    ...panelStyle,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  return (
    <div style={card}>
      {/* glow */}
      <div style={glowStyle} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 6 }}>
            Routyne
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0, maxWidth: 260 }}>
            {entry.sessionTitle}
          </h2>
        </div>

        {/* Badge */}
        <div style={{
          background: hasPRs ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${hasPRs ? 'rgba(251,191,36,0.35)' : 'rgba(52,211,153,0.25)'}`,
          borderRadius: 12,
          padding: '6px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{hasPRs ? '🏆' : '✅'}</span>
          <span style={{ fontSize: 9, fontWeight: 900, color: hasPRs ? 'rgba(251,191,36,0.8)' : 'rgba(52,211,153,0.7)', letterSpacing: '0.2em', marginTop: 4, textTransform: 'uppercase' }}>
            {hasPRs ? 'PR!' : 'Hecho'}
          </span>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, position: 'relative' }}>
        <div style={statPanelStyle}>
          <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>Duración</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#60a5fa', letterSpacing: '-0.02em', margin: 0 }}>{formatDuration(durationSeconds)}</p>
        </div>
        <div style={statPanelStyle}>
          <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>Volumen</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#818cf8', letterSpacing: '-0.02em', margin: 0 }}>
            {entry.totalVolume > 0 ? `${Math.round(entry.totalVolume).toLocaleString()}` : '—'}
            {entry.totalVolume > 0 && <span style={{ fontSize: 13, color: 'rgba(129,140,248,0.7)' }}>{weightUnit}</span>}
          </p>
        </div>
        <div style={statPanelStyle}>
          <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>Series</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em', margin: 0 }}>{totalSets}</p>
          {volumeDeltaPercent !== null && (
            <p style={{ fontSize: 9, fontWeight: 900, color: volumeDeltaPercent >= 0 ? '#34d399' : '#f87171', margin: 0 }}>
              {volumeDeltaPercent >= 0 ? '+' : ''}{volumeDeltaPercent.toFixed(0)}% vol
            </p>
          )}
        </div>
      </div>

      {/* ── PRs ── */}
      {hasPRs && (
        <div style={{ ...panelStyle, borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)', marginBottom: 16, position: 'relative' }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(251,191,36,0.6)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Récords personales
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {newPRs.slice(0, 3).map((pr, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pr.exerciseName}
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, color: '#fbbf24' }}>
                  {pr.weightDelta > 0 ? `+${pr.weightDelta.toFixed(1)}${weightUnit}` : pr.repsDelta > 0 ? `+${pr.repsDelta} reps` : '¡Nuevo PR!'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Exercise list ── */}
      {topExercises.length > 0 && (
        <div style={{ flex: 1, position: 'relative' }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 8px' }}>
            Ejercicios
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {topExercises.map((ev) => (
              <div key={ev.exerciseId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)', maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.cleanName}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                  {ev.setsCompleted} sets{ev.totalVolume > 0 ? ` · ${Math.round(ev.totalVolume)}${weightUnit}` : ''}
                </span>
              </div>
            ))}
            {entry.volumeData.length > 4 && (
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                +{entry.volumeData.length - 4} más
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Footer branding ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.2)' }}>
          Routyne · {SITE_HOST}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)' }}>
          {new Date(entry.completedAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
