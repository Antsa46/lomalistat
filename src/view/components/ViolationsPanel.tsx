import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { ProjectData, Violation } from "../../model/types";
import {
  computeCoverage,
  countWorkersWithSkillWorking,
  countWorkersWorkingInGroup,
  evaluateGroupWeek,
  getWorkerEffectiveGroupForWeek
} from "../../engine/constraints";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";

interface ViolationsPanelProps {
  project: ProjectData;
  onSuggestAssign: (workerId: string, week: number, groupId: string | null) => void;
  onSelectWorker?: (workerId: string) => void;
  selectedWorkerId?: string | null;
}

interface BackfillSuggestion {
  workerId: string;
  workerName: string;
  fromGroupId: string;
  fromGroupName: string;
  targetActualAfter: number;
  remainingMissing: number;
  donorSafe: boolean;
}

function statusVariant(missing: number): "success" | "warning" | "danger" {
  if (missing <= 0) {
    return "success";
  }
  if (missing === 1) {
    return "warning";
  }
  return "danger";
}

function setOverrideForWeek(
  base: ProjectData["plan"]["groupOverrides"],
  workerId: string,
  week: number,
  workerHomeGroupId: string,
  targetGroupId: string
): ProjectData["plan"]["groupOverrides"] {
  const next: ProjectData["plan"]["groupOverrides"] = {
    ...base,
    [workerId]: {
      ...(base[workerId] ?? {})
    }
  };

  if (targetGroupId === workerHomeGroupId) {
    delete next[workerId][week];
    if (Object.keys(next[workerId]).length === 0) {
      delete next[workerId];
    }
  } else {
    next[workerId][week] = targetGroupId;
  }

  return next;
}

function buildBackfillSuggestions(
  project: ProjectData,
  violation: Violation
): BackfillSuggestion[] {
  if (violation.missing <= 0) {
    return [];
  }

  const baseOverrides = project.plan.groupOverrides ?? {};
  const assignments = project.plan.assignments;
  const groupNameById = new Map(project.groups.map((group) => [group.id, group.name]));
  const suggestions: BackfillSuggestion[] = [];

  for (const worker of project.workers) {
    if ((assignments[worker.id]?.[violation.week] ?? "WORK") !== "WORK") {
      continue;
    }

    const currentGroupId = getWorkerEffectiveGroupForWeek(
      project,
      assignments,
      baseOverrides,
      worker.id,
      violation.week
    );
    if (!currentGroupId || currentGroupId === violation.groupId) {
      continue;
    }

    if (violation.type === "SKILL" && violation.skillId && !worker.skillIds.includes(violation.skillId)) {
      continue;
    }

    const updatedOverrides = setOverrideForWeek(
      baseOverrides,
      worker.id,
      violation.week,
      worker.groupId,
      violation.groupId
    );

    const targetActualAfter =
      violation.type === "HEADCOUNT"
        ? countWorkersWorkingInGroup(
            project,
            assignments,
            violation.groupId,
            violation.week,
            updatedOverrides
          )
        : countWorkersWithSkillWorking(
            project,
            assignments,
            violation.groupId,
            violation.week,
            violation.skillId ?? "",
            updatedOverrides
          );

    if (targetActualAfter <= violation.actual) {
      continue;
    }

    const donorCheck = evaluateGroupWeek(
      project,
      assignments,
      currentGroupId,
      violation.week,
      updatedOverrides
    );

    suggestions.push({
      workerId: worker.id,
      workerName: worker.name,
      fromGroupId: currentGroupId,
      fromGroupName: groupNameById.get(currentGroupId) ?? currentGroupId,
      targetActualAfter,
      remainingMissing: Math.max(0, violation.required - targetActualAfter),
      donorSafe: donorCheck.ok
    });
  }

  return suggestions
    .sort((a, b) => {
      if (a.donorSafe !== b.donorSafe) {
        return a.donorSafe ? -1 : 1;
      }
      if (a.remainingMissing !== b.remainingMissing) {
        return a.remainingMissing - b.remainingMissing;
      }
      return a.workerName.localeCompare(b.workerName);
    })
    .slice(0, 8);
}

export function ViolationsPanel({
  project,
  onSuggestAssign,
  onSelectWorker,
  selectedWorkerId
}: ViolationsPanelProps) {
  const [expandedViolationId, setExpandedViolationId] = useState<string | null>(null);
  const [selectedUnmetId, setSelectedUnmetId] = useState<string | null>(null);

  const coverageRows = useMemo(() => computeCoverage(project), [project]);
  const groupMap = useMemo(
    () => new Map(project.groups.map((group) => [group.id, group.name])),
    [project.groups]
  );
  const skillMap = useMemo(
    () => new Map(project.skills.map((skill) => [skill.id, skill.name])),
    [project.skills]
  );
  const workerMap = useMemo(
    () => new Map(project.workers.map((worker) => [worker.id, worker.name])),
    [project.workers]
  );
  const requestMap = useMemo(
    () => new Map(project.requests.map((request) => [request.id, request])),
    [project.requests]
  );

  const expandedViolation = useMemo(
    () => project.violations.find((violation) => violation.id === expandedViolationId) ?? null,
    [expandedViolationId, project.violations]
  );
  const expandedSuggestions = useMemo(
    () => (expandedViolation ? buildBackfillSuggestions(project, expandedViolation) : []),
    [expandedViolation, project]
  );

  useEffect(() => {
    if (!selectedUnmetId) {
      return;
    }
    const exists = project.unmetRequests.some((item) => item.id === selectedUnmetId);
    if (!exists) {
      setSelectedUnmetId(null);
    }
  }, [project.unmetRequests, selectedUnmetId]);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <CardTitle>Headcount + Skill coverage</CardTitle>
        <div className="max-h-64 space-y-2 overflow-auto pr-1">
          {coverageRows.map((row) => (
            <div key={`${row.groupId}-${row.week}`} className="rounded-xl border border-border p-2 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <strong>
                  {row.groupName} / W{row.week}
                </strong>
                <Badge variant={statusVariant(row.headcount.missing)}>
                  HC {row.headcount.actual}/{row.headcount.required}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {row.skills.length === 0 && <Badge variant="outline">No skill requirements</Badge>}
                {row.skills.map((skill) => (
                  <Badge key={`${row.groupId}-${row.week}-${skill.skillId}`} variant={statusVariant(skill.missing)}>
                    {skill.skillName}: {skill.actual}/{skill.required}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle>Violations ({project.violations.length})</CardTitle>
          {project.violations.length === 0 ? (
            <ShieldCheck size={18} className="text-green-600" />
          ) : (
            <AlertTriangle size={18} className="text-red-600" />
          )}
        </div>
        <div className="max-h-56 space-y-2 overflow-auto pr-1 text-xs">
          {project.violations.length === 0 && (
            <div className="rounded-xl bg-green-50 p-2 text-green-800">No violations.</div>
          )}
          {project.violations.map((violation) => (
            <div
              key={violation.id}
              className={cn(
                "rounded-xl border p-2",
                violation.missing > 0 ? "border-red-300 bg-red-50" : "border-border bg-white"
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedViolationId((prev) => (prev === violation.id ? null : violation.id))
                }
                className="w-full text-left"
              >
                <div className="font-semibold">
                  W{violation.week} / {groupMap.get(violation.groupId) ?? violation.groupId}
                </div>
                <div>
                  {violation.type}
                  {violation.skillId ? ` (${skillMap.get(violation.skillId) ?? violation.skillId})` : ""} req{" "}
                  {violation.required}, actual {violation.actual}, missing {violation.missing}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Click to {expandedViolationId === violation.id ? "hide" : "show"} backfill suggestions
                </div>
              </button>

              {expandedViolationId === violation.id && (
                <div className="mt-2 space-y-2 rounded-lg border border-red-200 bg-white p-2">
                  <div className="text-[11px] font-semibold text-muted-foreground">Suggested backfills</div>
                  {expandedSuggestions.length === 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      No direct candidate found from other groups for this week.
                    </div>
                  )}
                  {expandedSuggestions.map((suggestion) => (
                    <div
                      key={`${violation.id}-${suggestion.workerId}`}
                      className="rounded-lg border border-border p-2"
                    >
                      <div className="font-semibold">{suggestion.workerName}</div>
                      <div>
                        From {suggestion.fromGroupName}
                        {" -> "}
                        {groupMap.get(violation.groupId) ?? violation.groupId}
                      </div>
                      <div>
                        After move: actual {suggestion.targetActualAfter}/{violation.required}, missing{" "}
                        {suggestion.remainingMissing}
                      </div>
                      <div className={suggestion.donorSafe ? "text-green-700" : "text-amber-700"}>
                        Donor group check: {suggestion.donorSafe ? "safe" : "risk (may cause donor violation)"}
                      </div>
                      <Button
                        className="mt-2"
                        variant={suggestion.donorSafe ? "default" : "outline"}
                        onClick={() =>
                          onSuggestAssign(suggestion.workerId, violation.week, violation.groupId)
                        }
                      >
                        Assign for W{violation.week}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Unmet requests ({project.unmetRequests.length})</CardTitle>
        <div className="text-xs text-muted-foreground">
          Unmet means the request was not granted because granting it would break a hard constraint.
        </div>
        <div className="max-h-56 space-y-2 overflow-auto pr-1 text-xs">
          {project.unmetRequests.length === 0 && (
            <div className="rounded-xl bg-green-50 p-2 text-green-800">All requests are met.</div>
          )}
          {project.unmetRequests.map((unmet) => {
            const request = requestMap.get(unmet.requestId);
            const isActive = selectedUnmetId === unmet.id;
            const isWorkerSelected = selectedWorkerId === unmet.workerId;
            return (
              <button
                key={unmet.id}
                type="button"
                onClick={() => {
                  setSelectedUnmetId(unmet.id);
                  onSelectWorker?.(unmet.workerId);
                }}
                className={cn(
                  "w-full rounded-xl border p-2 text-left",
                  isActive
                    ? "border-sky-400 bg-sky-50"
                    : isWorkerSelected
                      ? "border-amber-400 bg-amber-50"
                      : "border-amber-300 bg-amber-50"
                )}
              >
                <div className="font-semibold">
                  {workerMap.get(unmet.workerId) ?? unmet.workerId} / W{unmet.week}
                </div>
                <div>
                  Request: W{request?.startWeek ?? "?"}-W{request?.endWeek ?? "?"}, P
                  {request?.priority ?? "?"}
                </div>
                <div>
                  If granted, would violate: {unmet.reasonType} / {groupMap.get(unmet.groupId) ?? unmet.groupId}
                  {unmet.skillId ? ` / ${skillMap.get(unmet.skillId) ?? unmet.skillId}` : ""}
                </div>
                <div>
                  required {unmet.required}, would be {unmet.actual}, missing {unmet.missing}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
