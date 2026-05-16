import { normalizeDateRange } from './dateRange';

describe('normalizeDateRange', () => {
  test('should default to the last 30 days when no inputs are provided', () => {
    const endBefore = Date.now();
    const range = normalizeDateRange({});
    const endAfter = Date.now();

    expect(range.end.getTime()).toBeGreaterThanOrEqual(endBefore);
    expect(range.end.getTime()).toBeLessThanOrEqual(endAfter);
    expect(range.end.getTime() - range.start.getTime()).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000 + 1000);
  });

  test('should clamp oversized ranges to the configured max window', () => {
    const range = normalizeDateRange({
      start: '2025-01-01T00:00:00.000Z',
      end: '2025-06-01T00:00:00.000Z',
      maxDays: 31,
    });

    expect(Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000))).toBe(31);
  });

  test('should normalize inverted inputs', () => {
    const range = normalizeDateRange({
      start: '2025-05-10T00:00:00.000Z',
      end: '2025-05-01T00:00:00.000Z',
      maxDays: 31,
    });

    expect(range.start.toISOString()).toBe('2025-05-01T00:00:00.000Z');
    expect(range.end.toISOString()).toBe('2025-05-10T00:00:00.000Z');
  });
});
