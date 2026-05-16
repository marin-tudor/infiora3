type DateRangeInput = {
  start?: string | Date | undefined;
  end?: string | Date | undefined;
  defaultDays?: number;
  maxDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const asDate = (value?: string | Date | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const normalizeDateRange = ({
  start,
  end,
  defaultDays = 30,
  maxDays = 93,
}: DateRangeInput): { start: Date; end: Date } => {
  const now = new Date();
  const resolvedEnd = asDate(end) ?? now;
  const resolvedStart = asDate(start) ?? new Date(resolvedEnd.getTime() - defaultDays * DAY_MS);

  let normalizedStart = resolvedStart;
  let normalizedEnd = resolvedEnd;

  if (normalizedStart > normalizedEnd) {
    normalizedStart = resolvedEnd;
    normalizedEnd = resolvedStart;
  }

  const maxWindowStart = new Date(normalizedEnd.getTime() - maxDays * DAY_MS);

  if (normalizedStart < maxWindowStart) {
    normalizedStart = maxWindowStart;
  }

  return { start: normalizedStart, end: normalizedEnd };
};
