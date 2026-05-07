import { describe, it, expect } from 'vitest';
import { suggestKcalAdjustment } from './adaptive';

// Helper: build n weight points with a constant week-over-week pct change.
// First 5 points are "previous week", last 5 are "recent week".
function buildSeries(prevAvgKg: number, recentAvgKg: number) {
  const previous = Array.from({ length: 5 }, (_, i) => ({
    date: `2026-01-0${i + 1}`,
    weightKg: prevAvgKg,
  }));
  const recent = Array.from({ length: 5 }, (_, i) => ({
    date: `2026-01-${10 + i + 1}`,
    weightKg: recentAvgKg,
  }));
  return [...previous, ...recent];
}

describe('suggestKcalAdjustment', () => {
  it('returns insufficient_data when fewer than 10 weights', () => {
    const result = suggestKcalAdjustment({
      goal: 'cut',
      recentWeights: buildSeries(80, 79).slice(0, 9),
      currentTargetKcal: 2400,
    });
    expect(result.reason).toBe('insufficient_data');
    expect(result.deltaKcal).toBe(0);
  });

  it('cut: -1.5%/week → too_fast → +125', () => {
    const result = suggestKcalAdjustment({
      goal: 'cut',
      recentWeights: buildSeries(100, 98.5),
      currentTargetKcal: 2400,
    });
    expect(result.reason).toBe('too_fast');
    expect(result.deltaKcal).toBe(125);
  });

  it('cut: -0.5%/week → on_track', () => {
    const result = suggestKcalAdjustment({
      goal: 'cut',
      recentWeights: buildSeries(100, 99.5),
      currentTargetKcal: 2400,
    });
    expect(result.reason).toBe('on_track');
    expect(result.deltaKcal).toBe(0);
  });

  it('cut: stalled → too_slow → -150', () => {
    const result = suggestKcalAdjustment({
      goal: 'cut',
      recentWeights: buildSeries(100, 100),
      currentTargetKcal: 2400,
    });
    expect(result.reason).toBe('too_slow');
    expect(result.deltaKcal).toBe(-150);
  });

  it('bulk: +0.7%/week → too_fast → -125', () => {
    const result = suggestKcalAdjustment({
      goal: 'bulk',
      recentWeights: buildSeries(80, 80.56),
      currentTargetKcal: 3000,
    });
    expect(result.reason).toBe('too_fast');
    expect(result.deltaKcal).toBe(-125);
  });

  it('bulk: stalled → too_slow → +150', () => {
    const result = suggestKcalAdjustment({
      goal: 'bulk',
      recentWeights: buildSeries(80, 80),
      currentTargetKcal: 3000,
    });
    expect(result.reason).toBe('too_slow');
    expect(result.deltaKcal).toBe(150);
  });

  it('recomp: -0.5%/week → too_slow → +100', () => {
    const result = suggestKcalAdjustment({
      goal: 'recomp',
      recentWeights: buildSeries(80, 79.6),
      currentTargetKcal: 2700,
    });
    expect(result.reason).toBe('too_slow');
    expect(result.deltaKcal).toBe(100);
  });

  it('recomp: +0.4%/week → too_fast → -100', () => {
    const result = suggestKcalAdjustment({
      goal: 'recomp',
      recentWeights: buildSeries(80, 80.32),
      currentTargetKcal: 2700,
    });
    expect(result.reason).toBe('too_fast');
    expect(result.deltaKcal).toBe(-100);
  });

  it('recomp: ±0.1%/week → on_track', () => {
    const result = suggestKcalAdjustment({
      goal: 'recomp',
      recentWeights: buildSeries(80, 80.08),
      currentTargetKcal: 2700,
    });
    expect(result.reason).toBe('on_track');
    expect(result.deltaKcal).toBe(0);
  });

  it('handles zero previous average defensively', () => {
    const result = suggestKcalAdjustment({
      goal: 'cut',
      recentWeights: buildSeries(0, 0),
      currentTargetKcal: 2400,
    });
    expect(result.reason).toBe('insufficient_data');
  });
});
