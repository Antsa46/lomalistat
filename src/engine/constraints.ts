import type {
  AssignmentState,
  GroupOverrides,
  ProjectData,
  SkillRequirement,
  Violation
} from "../model/types";
import { listWeeks } from "../model/weeks";

export interface ConstraintFailure {
  type: "HEADCOUNT" | "SKILL";
  groupId: string;
  skillId?: string;
  required: number;
  actual: number;
  missing: number;
}

export interface GroupCoverageRow {
  week: number;
  groupId: string;
  groupName: string;
  headcount: {
    required: number;
    actual: number;
    missing: number;
  };
  skills: Array<{
    skillId: string;
    skillName: string;
    required: number;
    actual: number;
    missing: number;
  }>;
}

export function buildDefaultAssignments(project: ProjectData): ProjectData["plan"]["assignments"] {
  const assignments: ProjectData["plan"]["assignments"] = {};
  const weeks = listWeeks(project.timeWindow);

  for (const worker of project.workers) {
    assignments[worker.id] = {};
    for (const week of weeks) {
      assignments[worker.id][week] = "WORK";
    }
  }

  return assignments;
}

export function getAssignment(
  assignments: ProjectData["plan"]["assignments"],
  workerId: string,
  week: number
): AssignmentState {
  return assignments[workerId]?.[week] ?? "WORK";
}

function workerHasGroup(project: ProjectData, groupId: string): boolean {
  return project.groups.some((group) => group.id === groupId);
}

export function getWorkerEffectiveGroupForWeek(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  groupOverrides: GroupOverrides,
  workerId: string,
  week: number
): string | null {
  const worker = project.workers.find((item) => item.id === workerId);
  if (!worker) {
    return null;
  }
  if (getAssignment(assignments, workerId, week) !== "WORK") {
    return null;
  }

  const overrideGroupId = groupOverrides[workerId]?.[week];
  if (overrideGroupId && workerHasGroup(project, overrideGroupId)) {
    return overrideGroupId;
  }

  return worker.groupId;
}

export function countWorkersWorkingInGroup(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  groupId: string,
  week: number,
  groupOverrides: GroupOverrides = project.plan.groupOverrides ?? {}
): number {
  let count = 0;
  for (const worker of project.workers) {
    const effectiveGroupId = getWorkerEffectiveGroupForWeek(
      project,
      assignments,
      groupOverrides,
      worker.id,
      week
    );
    if (effectiveGroupId === groupId) {
      count += 1;
    }
  }
  return count;
}

export function countWorkersWithSkillWorking(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  groupId: string,
  week: number,
  skillId: string,
  groupOverrides: GroupOverrides = project.plan.groupOverrides ?? {}
): number {
  let count = 0;
  for (const worker of project.workers) {
    if (!worker.skillIds.includes(skillId)) {
      continue;
    }
    const effectiveGroupId = getWorkerEffectiveGroupForWeek(
      project,
      assignments,
      groupOverrides,
      worker.id,
      week
    );
    if (effectiveGroupId === groupId) {
      count += 1;
    }
  }
  return count;
}

function requirementsForGroup(
  project: ProjectData,
  groupId: string
): SkillRequirement[] {
  return project.skillRequirements
    .filter((req) => req.groupId === groupId)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function evaluateGroupWeek(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  groupId: string,
  week: number,
  groupOverrides: GroupOverrides = project.plan.groupOverrides ?? {}
): { ok: true } | { ok: false; failure: ConstraintFailure } {
  const group = project.groups.find((item) => item.id === groupId);
  if (!group) {
    return { ok: true };
  }

  const headcountActual = countWorkersWorkingInGroup(project, assignments, groupId, week, groupOverrides);
  if (headcountActual < group.minHeadcountPerWeek) {
    return {
      ok: false,
      failure: {
        type: "HEADCOUNT",
        groupId,
        required: group.minHeadcountPerWeek,
        actual: headcountActual,
        missing: group.minHeadcountPerWeek - headcountActual
      }
    };
  }

  for (const requirement of requirementsForGroup(project, groupId)) {
    const actual = countWorkersWithSkillWorking(
      project,
      assignments,
      groupId,
      week,
      requirement.skillId,
      groupOverrides
    );
    if (actual < requirement.minPerWeek) {
      return {
        ok: false,
        failure: {
          type: "SKILL",
          groupId,
          skillId: requirement.skillId,
          required: requirement.minPerWeek,
          actual,
          missing: requirement.minPerWeek - actual
        }
      };
    }
  }

  return { ok: true };
}

export function computeViolations(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"] = project.plan.assignments,
  groupOverrides: GroupOverrides = project.plan.groupOverrides ?? {}
): Violation[] {
  const violations: Violation[] = [];
  const weeks = listWeeks(project.timeWindow);

  for (const group of project.groups) {
    const reqs = requirementsForGroup(project, group.id);
    for (const week of weeks) {
      const actualHeadcount = countWorkersWorkingInGroup(
        project,
        assignments,
        group.id,
        week,
        groupOverrides
      );
      if (actualHeadcount < group.minHeadcountPerWeek) {
        violations.push({
          id: `v-${group.id}-${week}-HEADCOUNT`,
          week,
          groupId: group.id,
          type: "HEADCOUNT",
          required: group.minHeadcountPerWeek,
          actual: actualHeadcount,
          missing: group.minHeadcountPerWeek - actualHeadcount
        });
      }

      for (const req of reqs) {
        const actualSkill = countWorkersWithSkillWorking(
          project,
          assignments,
          group.id,
          week,
          req.skillId,
          groupOverrides
        );
        if (actualSkill < req.minPerWeek) {
          violations.push({
            id: `v-${group.id}-${week}-SKILL-${req.skillId}`,
            week,
            groupId: group.id,
            type: "SKILL",
            skillId: req.skillId,
            required: req.minPerWeek,
            actual: actualSkill,
            missing: req.minPerWeek - actualSkill
          });
        }
      }
    }
  }

  return violations;
}

export function computeCoverage(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"] = project.plan.assignments,
  groupOverrides: GroupOverrides = project.plan.groupOverrides ?? {}
): GroupCoverageRow[] {
  const rows: GroupCoverageRow[] = [];
  const skillNameById = new Map(project.skills.map((skill) => [skill.id, skill.name]));
  const weeks = listWeeks(project.timeWindow);

  for (const group of project.groups) {
    const reqs = requirementsForGroup(project, group.id);
    for (const week of weeks) {
      const headcountActual = countWorkersWorkingInGroup(
        project,
        assignments,
        group.id,
        week,
        groupOverrides
      );
      rows.push({
        week,
        groupId: group.id,
        groupName: group.name,
        headcount: {
          required: group.minHeadcountPerWeek,
          actual: headcountActual,
          missing: Math.max(0, group.minHeadcountPerWeek - headcountActual)
        },
        skills: reqs.map((req) => {
          const actual = countWorkersWithSkillWorking(
            project,
            assignments,
            group.id,
            week,
            req.skillId,
            groupOverrides
          );
          return {
            skillId: req.skillId,
            skillName: skillNameById.get(req.skillId) ?? req.skillId,
            required: req.minPerWeek,
            actual,
            missing: Math.max(0, req.minPerWeek - actual)
          };
        })
      });
    }
  }

  return rows;
}
