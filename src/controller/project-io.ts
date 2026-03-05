import type { ProjectData } from "../model/types";
import { migrateToV1 } from "../model/migrations";
import { validateProjectV1 } from "../model/validation";

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function createExportFilename(project: ProjectData): string {
  const baseName = sanitizeName(project.project.name) || "project";
  const { year, startWeek, endWeek } = project.timeWindow;
  return `${baseName}_${year}_${startWeek}-${endWeek}.json`;
}

export function exportProjectToJson(project: ProjectData): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectFromJson(rawJson: string): ProjectData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Import failed: tiedosto ei ollut validia JSONia.");
  }

  const migrated = migrateToV1(parsed);
  const validation = validateProjectV1(migrated);
  if (!validation.valid || !validation.value) {
    throw new Error(`Import failed: ${validation.errors.join(" ")}`);
  }
  return validation.value;
}

