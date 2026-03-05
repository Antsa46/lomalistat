import { useMemo } from "react";
import type { ProjectData } from "../../model/types";
import { Badge } from "../../components/ui/badge";
import { Card, CardTitle } from "../../components/ui/card";

interface WorkerDetailsPanelProps {
  project: ProjectData;
  workerId: string | null;
}

export function WorkerDetailsPanel({ project, workerId }: WorkerDetailsPanelProps) {
  const worker = useMemo(
    () => project.workers.find((item) => item.id === workerId) ?? null,
    [project.workers, workerId]
  );
  const groupMap = useMemo(
    () => new Map(project.groups.map((group) => [group.id, group.name])),
    [project.groups]
  );
  const skillMap = useMemo(
    () => new Map(project.skills.map((skill) => [skill.id, skill.name])),
    [project.skills]
  );
  const requests = useMemo(
    () =>
      worker
        ? project.requests
            .filter((request) => request.workerId === worker.id)
            .sort((a, b) => a.startWeek - b.startWeek)
        : [],
    [project.requests, worker]
  );
  const unmetForWorker = useMemo(
    () =>
      worker
        ? project.unmetRequests.filter((unmet) => unmet.workerId === worker.id).slice(0, 12)
        : [],
    [project.unmetRequests, worker]
  );
  const vacationWeeks = useMemo(() => {
    if (!worker) {
      return [];
    }
    const assignments = project.plan.assignments[worker.id] ?? {};
    return Object.entries(assignments)
      .filter(([, assignment]) => assignment === "VACATION")
      .map(([week]) => Number(week))
      .sort((a, b) => a - b);
  }, [project.plan.assignments, worker]);
  const borrowedWeeks = useMemo(() => {
    if (!worker) {
      return [];
    }
    const overrides = project.plan.groupOverrides?.[worker.id] ?? {};
    return Object.entries(overrides)
      .map(([week, groupId]) => ({ week: Number(week), groupId }))
      .sort((a, b) => a.week - b.week);
  }, [project.plan.groupOverrides, worker]);

  return (
    <Card className="space-y-3">
      <CardTitle>Worker details</CardTitle>
      {!worker && <div className="rounded-xl bg-slate-100 p-2 text-sm">Select a worker from the planner grid.</div>}

      {worker && (
        <>
          <div className="rounded-xl border border-border p-3 text-sm">
            <div className="font-semibold">{worker.name}</div>
            <div className="text-xs text-muted-foreground">
              Group: {groupMap.get(worker.groupId) ?? worker.groupId}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Skills</div>
            <div className="flex flex-wrap gap-1">
              {worker.skillIds.length === 0 && <Badge variant="outline">No skills</Badge>}
              {worker.skillIds.map((skillId) => (
                <Badge key={skillId} variant="outline">
                  {skillMap.get(skillId) ?? skillId}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Vacation requests</div>
            <div className="space-y-1 text-xs">
              {requests.length === 0 && <div className="rounded-lg bg-slate-100 p-2">No requests</div>}
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-border p-2">
                  W{request.startWeek}-W{request.endWeek}, priority {request.priority}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Planned vacation weeks</div>
            <div className="flex flex-wrap gap-1">
              {vacationWeeks.length === 0 && <Badge variant="outline">None</Badge>}
              {vacationWeeks.map((week) => (
                <Badge key={week} variant="warning">
                  W{week}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Unmet reasons</div>
            <div className="space-y-1 text-xs">
              {unmetForWorker.length === 0 && <div className="rounded-lg bg-green-50 p-2 text-green-800">None</div>}
              {unmetForWorker.map((item) => (
                <div key={item.id} className="rounded-lg border border-amber-300 bg-amber-50 p-2">
                  W{item.week}: {item.reasonType} req {item.required}, actual {item.actual}, missing{" "}
                  {item.missing}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Borrowed to other groups</div>
            <div className="space-y-1 text-xs">
              {borrowedWeeks.length === 0 && <div className="rounded-lg bg-slate-100 p-2">None</div>}
              {borrowedWeeks.map((entry) => (
                <div key={`${entry.week}-${entry.groupId}`} className="rounded-lg border border-border p-2">
                  W{entry.week}: {groupMap.get(entry.groupId) ?? entry.groupId}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
