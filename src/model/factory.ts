import { createId, nowIso } from "./id";
import type { ProjectData } from "./types";
import { normalizeTimeWindow } from "./weeks";

export function createEmptyProject(
  name: string,
  year: number,
  startWeek: number,
  endWeek: number
): ProjectData {
  const now = nowIso();
  return {
    schemaVersion: 1,
    project: {
      id: createId("project"),
      name: name.trim() || "Uusi projekti",
      createdAt: now,
      updatedAt: now
    },
    timeWindow: normalizeTimeWindow({
      year,
      startWeek,
      endWeek
    }),
    groups: [],
    skills: [],
    skillRequirements: [],
    workers: [],
    requests: [],
    plan: {
      assignments: {},
      groupOverrides: {},
      generatedAt: now
    },
    violations: [],
    unmetRequests: []
  };
}
