/**
 * shiftTolerance pass criterion — auto-pass pure element shifts within a
 * per-axis pixel bound (the ported layout-tolerance layer).
 */
import { applyPassCriteria } from '../report/compare';
import type { SnapshotResult } from '../report/results';

const changed = (regions?: SnapshotResult['regions']): SnapshotResult => ({
  name: 's',
  status: 'changed',
  diffPercent: 3,
  diffCount: 3000,
  totalPixels: 100000,
  regions,
});

const shiftRegion = (dx: number, dy: number) => ({
  x: 0, y: 0, width: 10, height: 10, diffPixels: 50, diffPercent: 50,
  classification: 'shift' as const,
  shift: { dx, dy },
  elements: [{ selector: 'div.card', role: 'shifted' as const }],
});

const changeRegion = () => ({
  x: 0, y: 0, width: 10, height: 10, diffPixels: 50, diffPercent: 50,
  classification: 'change' as const,
});

describe('shiftTolerance', () => {
  it('auto-passes when every region is a pure shift within tolerance', () => {
    const r = changed([shiftRegion(0, 1), shiftRegion(1, -2)]);
    applyPassCriteria(r, { shiftTolerance: 2 });
    expect(r.status).toBe('passed');
    expect(r.autoPassed).toBe('shift');
  });

  it('stays changed when any shift exceeds the tolerance', () => {
    const r = changed([shiftRegion(0, 1), shiftRegion(0, 24)]);
    applyPassCriteria(r, { shiftTolerance: 2 });
    expect(r.status).toBe('changed');
    expect(r.autoPassed).toBeUndefined();
  });

  it('stays changed when any region is a content change', () => {
    const r = changed([shiftRegion(0, 1), changeRegion()]);
    applyPassCriteria(r, { shiftTolerance: 2 });
    expect(r.status).toBe('changed');
  });

  it('stays changed for unattributed regions (no classification)', () => {
    const r = changed([{ x: 0, y: 0, width: 10, height: 10, diffPixels: 50, diffPercent: 50 }]);
    applyPassCriteria(r, { shiftTolerance: 2 });
    expect(r.status).toBe('changed');
  });

  it('does nothing when tolerance is unset or 0', () => {
    const r = changed([shiftRegion(0, 1)]);
    applyPassCriteria(r, {});
    expect(r.status).toBe('changed');
    const r2 = changed([shiftRegion(0, 1)]);
    applyPassCriteria(r2, { shiftTolerance: 0 });
    expect(r2.status).toBe('changed');
  });

  it('does nothing without regions (no evidence, no pass)', () => {
    const r = changed(undefined);
    applyPassCriteria(r, { shiftTolerance: 2 });
    expect(r.status).toBe('changed');
  });
});
