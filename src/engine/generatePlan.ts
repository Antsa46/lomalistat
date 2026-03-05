import type { ProjectData, UnmetRequest } from "../model/types";
import { nowIso } from "../model/id";
import { isWeekInTimeWindow } from "../model/weeks";
import {
  buildDefaultAssignments,
  countWorkersWithSkillWorking,
  countWorkersWorkingInGroup,
  type ConstraintFailure,
  computeViolations,
  evaluateGroupWeek,
  getWorkerEffectiveGroupForWeek
} from "./constraints";

export interface GeneratePlanResult {
  plan: ProjectData["plan"];
  violations: ProjectData["violations"];
  unmetRequests: UnmetRequest[];
}

interface GeneratePlanOptions {
  allowTransfers: boolean;
}

function replaceOverrides(
  target: ProjectData["plan"]["groupOverrides"],
  source: ProjectData["plan"]["groupOverrides"]
): void {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, source);
}

function setWorkerOverrideForWeek(
  overrides: ProjectData["plan"]["groupOverrides"],
  workerId: string,
  workerHomeGroupId: string,
  week: number,
  targetGroupId: string | null
): void {
  if (!targetGroupId || targetGroupId === workerHomeGroupId) {
    if (overrides[workerId]) {
      delete overrides[workerId][week];
      if (Object.keys(overrides[workerId]).length === 0) {
        delete overrides[workerId];
      }
    }
    return;
  }

  overrides[workerId] ??= {};
  overrides[workerId][week] = targetGroupId;
}

function missingForFailureType(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  overrides: ProjectData["plan"]["groupOverrides"],
  groupId: string,
  week: number,
  failure:
    | {
        type: "HEADCOUNT";
        required: number;
      }
    | {
        type: "SKILL";
        required: number;
        skillId: string;
      }
): number {
  if (failure.type === "HEADCOUNT") {
    const actual = countWorkersWorkingInGroup(project, assignments, groupId, week, overrides);
    return Math.max(0, failure.required - actual);
  }

  const actual = countWorkersWithSkillWorking(
    project,
    assignments,
    groupId,
    week,
    failure.skillId,
    overrides
  );
  return Math.max(0, failure.required - actual);
}

function pickBestBackfillCandidate(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  overrides: ProjectData["plan"]["groupOverrides"],
  targetGroupId: string,
  week: number,
  failure: {
    type: "HEADCOUNT" | "SKILL";
    required: number;
    missing: number;
    skillId?: string;
  },
  excludedWorkerIds: Set<string>
): { workerId: string } | null {
  const sortedWorkers = [...project.workers].sort((a, b) => a.id.localeCompare(b.id));
  let best: { workerId: string; remainingMissing: number } | null = null;

  for (const worker of sortedWorkers) {
    if (excludedWorkerIds.has(worker.id)) {
      continue;
    }
    if ((assignments[worker.id]?.[week] ?? "WORK") !== "WORK") {
      continue;
    }

    const donorGroupId = getWorkerEffectiveGroupForWeek(
      project,
      assignments,
      overrides,
      worker.id,
      week
    );
    if (!donorGroupId || donorGroupId === targetGroupId) {
      continue;
    }

    if (failure.type === "SKILL" && failure.skillId && !worker.skillIds.includes(failure.skillId)) {
      continue;
    }

    const trialOverrides = structuredClone(overrides);
    setWorkerOverrideForWeek(trialOverrides, worker.id, worker.groupId, week, targetGroupId);

    const donorOk = evaluateGroupWeek(project, assignments, donorGroupId, week, trialOverrides);
    if (!donorOk.ok) {
      continue;
    }

    const remainingMissing =
      failure.type === "HEADCOUNT"
        ? missingForFailureType(project, assignments, trialOverrides, targetGroupId, week, {
            type: "HEADCOUNT",
            required: failure.required
          })
        : missingForFailureType(project, assignments, trialOverrides, targetGroupId, week, {
            type: "SKILL",
            required: failure.required,
            skillId: failure.skillId ?? ""
          });

    if (remainingMissing >= failure.missing) {
      continue;
    }

    if (!best || remainingMissing < best.remainingMissing) {
      best = {
        workerId: worker.id,
        remainingMissing
      };
    }
  }

  return best;
}

function tryAutoBackfillForWeek(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  overrides: ProjectData["plan"]["groupOverrides"],
  targetGroupId: string,
  week: number,
  excludedWorkerIds: Set<string>
): { ok: true } | { ok: false; failure: ConstraintFailure } {
  const excluded = new Set(excludedWorkerIds);

  for (let i = 0; i < project.workers.length; i += 1) {
    const validation = evaluateGroupWeek(project, assignments, targetGroupId, week, overrides);
    if (validation.ok) {
      return { ok: true };
    }

    const candidate = pickBestBackfillCandidate(
      project,
      assignments,
      overrides,
      targetGroupId,
      week,
      validation.failure,
      excluded
    );
    if (!candidate) {
      return { ok: false, failure: validation.failure };
    }

    const worker = project.workers.find((item) => item.id === candidate.workerId);
    if (!worker) {
      return { ok: false, failure: validation.failure };
    }
    setWorkerOverrideForWeek(overrides, worker.id, worker.groupId, week, targetGroupId);
    excluded.add(worker.id);
  }

  const finalValidation = evaluateGroupWeek(project, assignments, targetGroupId, week, overrides);
  if (finalValidation.ok) {
    return { ok: true };
  }

  return { ok: false, failure: finalValidation.failure };
}

function runGeneratePlan(project: ProjectData, options: GeneratePlanOptions): GeneratePlanResult {
  const assignments = buildDefaultAssignments(project);
  const groupOverrides: ProjectData["plan"]["groupOverrides"] = {};
  const sortedRequests = [...project.requests].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id.localeCompare(b.id);
  });
  const unmetRequests: UnmetRequest[] = [];

  for (const request of sortedRequests) {
    const worker = project.workers.find((item) => item.id === request.workerId);
    if (!worker) {
      continue;
    }

    for (let week = request.startWeek; week <= request.endWeek; week += 1) {
      if (!isWeekInTimeWindow(week, project.timeWindow)) {
        continue;
      }
      if ((assignments[worker.id]?.[week] ?? "WORK") === "VACATION") {
        continue;
      }

      const evaluatedGroupId =
        getWorkerEffectiveGroupForWeek(project, assignments, groupOverrides, worker.id, week) ??
        worker.groupId;
      const previousAssignment = assignments[worker.id]?.[week] ?? "WORK";
      const snapshotOverrides = structuredClone(groupOverrides);
      assignments[worker.id] ??= {};
      assignments[worker.id][week] = "VACATION";
      setWorkerOverrideForWeek(groupOverrides, worker.id, worker.groupId, week, null);

      let validation = evaluateGroupWeek(project, assignments, evaluatedGroupId, week, groupOverrides);

      if (!validation.ok && options.allowTransfers) {
        const transferResult = tryAutoBackfillForWeek(
          project,
          assignments,
          groupOverrides,
          evaluatedGroupId,
          week,
          new Set([worker.id])
        );
        if (transferResult.ok) {
          continue;
        }
        validation = {
          ok: false,
          failure: transferResult.failure
        };
      }

      if (validation.ok) {
        continue;
      }

      assignments[worker.id][week] = previousAssignment;
      replaceOverrides(groupOverrides, snapshotOverrides);
      unmetRequests.push({
        id: `ur-${request.id}-${week}`,
        requestId: request.id,
        workerId: request.workerId,
        week,
        reasonType: validation.failure.type,
        groupId: validation.failure.groupId,
        skillId: validation.failure.skillId,
        required: validation.failure.required,
        actual: validation.failure.actual,
        missing: validation.failure.missing
      });
    }
  }

  const plan: ProjectData["plan"] = {
    assignments,
    groupOverrides,
    generatedAt: nowIso()
  };

  const violations = computeViolations(project, assignments, groupOverrides);
  return {
    plan,
    violations,
    unmetRequests
  };
}

export function generatePlan(project: ProjectData): GeneratePlanResult {
  return runGeneratePlan(project, { allowTransfers: false });
}

export function generatePlanWithTransfers(project: ProjectData): GeneratePlanResult {
  return runGeneratePlan(project, { allowTransfers: true });
}
