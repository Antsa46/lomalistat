import type { ProjectData } from "./types";
import { nowIso } from "./id";
import { normalizeTimeWindow } from "./weeks";

function asRecord(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  return input as Record<string, unknown>;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

export function migrateToV1(input: unknown): ProjectData {
  const now = nowIso();
  const source = asRecord(input);
  if (!source) {
    throw new Error("Imported JSON is not an object.");
  }

  if (source.schemaVersion !== undefined && source.schemaVersion !== 1) {
    throw new Error(`Unsupported schemaVersion: ${String(source.schemaVersion)}`);
  }

  const projectSource = asRecord(source.project) ?? {};
  const timeWindowSource = asRecord(source.timeWindow) ?? {};
  const planSource = asRecord(source.plan) ?? {};

  return {
    schemaVersion: 1,
    project: {
      id: asString(projectSource.id, `import-${Date.now().toString(36)}`),
      name: asString(projectSource.name, "Tuotu projekti"),
      createdAt: asString(projectSource.createdAt, now),
      updatedAt: asString(projectSource.updatedAt, now)
    },
    timeWindow: normalizeTimeWindow({
      year: asNumber(timeWindowSource.year, new Date().getFullYear()),
      startWeek: asNumber(timeWindowSource.startWeek, 1),
      endWeek: asNumber(timeWindowSource.endWeek, 52),
      includeMonths: Array.isArray(timeWindowSource.includeMonths)
        ? timeWindowSource.includeMonths
            .map((item) => asNumber(item, 0))
            .filter((month) => month >= 1 && month <= 12)
        : undefined
    }),
    groups: Array.isArray(source.groups) ? (source.groups as ProjectData["groups"]) : [],
    skills: Array.isArray(source.skills) ? (source.skills as ProjectData["skills"]) : [],
    skillRequirements: Array.isArray(source.skillRequirements)
      ? (source.skillRequirements as ProjectData["skillRequirements"])
      : [],
    workers: Array.isArray(source.workers) ? (source.workers as ProjectData["workers"]) : [],
    requests: Array.isArray(source.requests) ? (source.requests as ProjectData["requests"]) : [],
    plan: {
      assignments:
        typeof planSource.assignments === "object" && planSource.assignments !== null
          ? (planSource.assignments as ProjectData["plan"]["assignments"])
          : {},
      groupOverrides:
        typeof planSource.groupOverrides === "object" && planSource.groupOverrides !== null
          ? (planSource.groupOverrides as ProjectData["plan"]["groupOverrides"])
          : {},
      generatedAt: asString(planSource.generatedAt, now),
      notes: typeof planSource.notes === "string" ? planSource.notes : undefined
    },
    violations: Array.isArray(source.violations)
      ? (source.violations as ProjectData["violations"])
      : [],
    unmetRequests: Array.isArray(source.unmetRequests)
      ? (source.unmetRequests as ProjectData["unmetRequests"])
      : []
  };
}
