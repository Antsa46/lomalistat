import type { ProjectData, UnmetRequest } from "../model/types";
import { isWeekInTimeWindow } from "../model/weeks";
import {
  computeViolations,
  evaluateGroupWeek,
  getWorkerEffectiveGroupForWeek
} from "./constraints";

function recomputeUnmetRequests(
  project: ProjectData,
  assignments: ProjectData["plan"]["assignments"],
  groupOverrides: ProjectData["plan"]["groupOverrides"]
): UnmetRequest[] {
  const unmetRequests: UnmetRequest[] = [];
  const sortedRequests = [...project.requests].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id.localeCompare(b.id);
  });

  for (const request of sortedRequests) {
    const worker = project.workers.find((item) => item.id === request.workerId);
    if (!worker) {
      continue;
    }
    const workerAssignments = assignments[worker.id] ?? {};
    assignments[worker.id] = workerAssignments;

    for (let week = request.startWeek; week <= request.endWeek; week += 1) {
      if (!isWeekInTimeWindow(week, project.timeWindow)) {
        continue;
      }
      if (workerAssignments[week] === "VACATION") {
        continue;
      }

      const previous = workerAssignments[week] ?? "WORK";
      workerAssignments[week] = "VACATION";
      const evaluatedGroupId =
        getWorkerEffectiveGroupForWeek(project, assignments, groupOverrides, worker.id, week) ??
        worker.groupId;
      const result = evaluateGroupWeek(project, assignments, evaluatedGroupId, week, groupOverrides);
      workerAssignments[week] = previous;
      if (result.ok) {
        continue;
      }

      unmetRequests.push({
        id: `ur-${request.id}-${week}`,
        requestId: request.id,
        workerId: request.workerId,
        week,
        reasonType: result.failure.type,
        groupId: result.failure.groupId,
        skillId: result.failure.skillId,
        required: result.failure.required,
        actual: result.failure.actual,
        missing: result.failure.missing
      });
    }
  }

  return unmetRequests;
}

export function recalculateDerived(project: ProjectData): {
  violations: ProjectData["violations"];
  unmetRequests: ProjectData["unmetRequests"];
} {
  const assignments = project.plan.assignments;
  const groupOverrides = project.plan.groupOverrides ?? {};
  return {
    violations: computeViolations(project, assignments, groupOverrides),
    unmetRequests: recomputeUnmetRequests(project, assignments, groupOverrides)
  };
}
