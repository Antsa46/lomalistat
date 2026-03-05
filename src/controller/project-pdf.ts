import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ProjectData } from "../model/types";
import { listWeeks } from "../model/weeks";

export type PdfExportMode = "vacations_only" | "full";

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createPdfFilename(project: ProjectData, mode: PdfExportMode): string {
  const baseName = sanitizeName(project.project.name) || "project";
  const { year, startWeek, endWeek } = project.timeWindow;
  if (mode === "vacations_only") {
    return `${baseName}_${year}_${startWeek}-${endWeek}_vacations.pdf`;
  }
  return `${baseName}_${year}_${startWeek}-${endWeek}.pdf`;
}

function toRanges(weeks: number[]): string {
  if (weeks.length === 0) {
    return "none";
  }
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const week = sorted[i];
    if (week === previous + 1) {
      previous = week;
      continue;
    }
    ranges.push(start === previous ? `W${start}` : `W${start}-W${previous}`);
    start = week;
    previous = week;
  }
  ranges.push(start === previous ? `W${start}` : `W${start}-W${previous}`);
  return ranges.join(", ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) {
    return [""];
  }
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
      continue;
    }
    let part = "";
    for (const char of word) {
      const candidate = `${part}${char}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        part = candidate;
      } else {
        lines.push(part);
        part = char;
      }
    }
    current = part;
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export async function exportProjectToPdf(project: ProjectData): Promise<{
  filename: string;
  bytes: Uint8Array;
}>;
export async function exportProjectToPdf(
  project: ProjectData,
  options: { mode?: PdfExportMode }
): Promise<{
  filename: string;
  bytes: Uint8Array;
}>;
export async function exportProjectToPdf(
  project: ProjectData,
  options?: { mode?: PdfExportMode }
): Promise<{
  filename: string;
  bytes: Uint8Array;
}> {
  const mode: PdfExportMode = options?.mode ?? "full";
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let page: PDFPage = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (heightNeeded: number) => {
    if (y - heightNeeded >= margin) {
      return;
    }
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const writeLine = (
    text: string,
    options: {
      bold?: boolean;
      size?: number;
      color?: { r: number; g: number; b: number };
      indent?: number;
      gapAfter?: number;
    } = {}
  ) => {
    const size = options.size ?? 10;
    const lineHeight = size + 4;
    const font = options.bold ? fontBold : fontRegular;
    const indent = options.indent ?? 0;
    const maxWidth = contentWidth - indent;
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color: options.color ? rgb(options.color.r, options.color.g, options.color.b) : rgb(0, 0, 0)
      });
      y -= lineHeight;
    }
    if (options.gapAfter) {
      y -= options.gapAfter;
    }
  };

  const weeks = listWeeks(project.timeWindow);
  const groupMap = new Map(project.groups.map((group) => [group.id, group.name]));
  const skillMap = new Map(project.skills.map((skill) => [skill.id, skill.name]));

  writeLine("Lomalistat - Project PDF Export", {
    bold: true,
    size: 16,
    color: { r: 0.06, g: 0.19, b: 0.39 },
    gapAfter: 4
  });
  writeLine(mode === "vacations_only" ? "Mode: Vacations only" : "Mode: Full report");
  writeLine(`Project: ${project.project.name}`, { bold: true });
  writeLine(
    `Time window: ${project.timeWindow.year}, weeks W${project.timeWindow.startWeek}-W${project.timeWindow.endWeek}`
  );
  writeLine(`Groups: ${project.groups.length}, Workers: ${project.workers.length}`);
  writeLine(`Requests: ${project.requests.length}, Violations: ${project.violations.length}`);
  writeLine(`Unmet requests: ${project.unmetRequests.length}`, { gapAfter: 6 });

  if (mode === "full") {
    writeLine("Groups", { bold: true, size: 12 });
    for (const group of project.groups) {
      writeLine(
        `- ${group.name}: min headcount per week ${group.minHeadcountPerWeek}`
      );
    }
    writeLine("", { gapAfter: 2 });

    writeLine("Skill requirements", { bold: true, size: 12 });
    if (project.skillRequirements.length === 0) {
      writeLine("- none");
    } else {
      const sortedRequirements = [...project.skillRequirements].sort((a, b) => {
        if (a.groupId !== b.groupId) {
          return a.groupId.localeCompare(b.groupId);
        }
        return a.skillId.localeCompare(b.skillId);
      });
      for (const requirement of sortedRequirements) {
        writeLine(
          `- ${groupMap.get(requirement.groupId) ?? requirement.groupId}: ${
            skillMap.get(requirement.skillId) ?? requirement.skillId
          } min ${requirement.minPerWeek}/week`
        );
      }
    }
    writeLine("", { gapAfter: 2 });
  }

  writeLine("Workers and planned vacation weeks", { bold: true, size: 12 });
  const sortedWorkers = [...project.workers].sort((a, b) => a.name.localeCompare(b.name));
  for (const worker of sortedWorkers) {
    const workerAssignments = project.plan.assignments[worker.id] ?? {};
    const vacationWeeks = weeks.filter((week) => workerAssignments[week] === "VACATION");
    if (mode === "vacations_only") {
      writeLine(
        `- ${worker.name} | Team: ${groupMap.get(worker.groupId) ?? worker.groupId} | Vacation: ${toRanges(vacationWeeks)}`
      );
    } else {
      writeLine(
        `- ${worker.name} (${groupMap.get(worker.groupId) ?? worker.groupId}) | Skills: ${
          worker.skillIds.length
        } | Vacation: ${toRanges(vacationWeeks)}`
      );
    }
  }
  writeLine("", { gapAfter: 2 });

  if (mode === "full") {
    writeLine("Top violations", { bold: true, size: 12 });
    if (project.violations.length === 0) {
      writeLine("- none");
    } else {
      const sortedViolations = [...project.violations]
        .sort((a, b) => b.missing - a.missing || a.week - b.week)
        .slice(0, 200);
      for (const violation of sortedViolations) {
        writeLine(
          `- W${violation.week} ${groupMap.get(violation.groupId) ?? violation.groupId} ${
            violation.type
          }${violation.skillId ? ` ${skillMap.get(violation.skillId) ?? violation.skillId}` : ""}: req ${
            violation.required
          }, actual ${violation.actual}, missing ${violation.missing}`
        );
      }
    }
  }

  const bytes = await pdf.save();
  return {
    filename: createPdfFilename(project, mode),
    bytes
  };
}
