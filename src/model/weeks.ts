import type { TimeWindow } from "./types";

export function clampWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1;
  }
  return Math.min(53, Math.max(1, Math.trunc(week)));
}

export function normalizeTimeWindow(timeWindow: TimeWindow): TimeWindow {
  const startWeek = clampWeek(timeWindow.startWeek);
  const endWeek = clampWeek(timeWindow.endWeek);
  return {
    ...timeWindow,
    startWeek: Math.min(startWeek, endWeek),
    endWeek: Math.max(startWeek, endWeek)
  };
}

export function listWeeks(timeWindow: TimeWindow): number[] {
  const normalized = normalizeTimeWindow(timeWindow);
  const weeks: number[] = [];
  for (let week = normalized.startWeek; week <= normalized.endWeek; week += 1) {
    weeks.push(week);
  }
  return weeks;
}

export function weekCount(timeWindow: TimeWindow): number {
  return listWeeks(timeWindow).length;
}

export function isWeekInTimeWindow(week: number, timeWindow: TimeWindow): boolean {
  const normalized = normalizeTimeWindow(timeWindow);
  return week >= normalized.startWeek && week <= normalized.endWeek;
}

