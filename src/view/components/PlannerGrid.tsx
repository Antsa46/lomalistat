import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ProjectData } from "../../model/types";
import {
  countWorkersWorkingInGroup,
  getWorkerEffectiveGroupForWeek
} from "../../engine/constraints";
import { listWeeks } from "../../model/weeks";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { Table, TableWrapper, Td, Th } from "../../components/ui/table";

interface PlannerGridProps {
  project: ProjectData;
  onToggle: (workerId: string, week: number) => void;
  onSetGroupOverride: (workerId: string, week: number, groupId: string | null) => void;
  selectedWorkerId: string | null;
  onSelectWorker: (workerId: string) => void;
}

interface GroupOverrideDialogState {
  workerId: string;
  week: number;
  selectedGroupId: string;
}

export function PlannerGrid({
  project,
  onToggle,
  onSetGroupOverride,
  selectedWorkerId,
  onSelectWorker
}: PlannerGridProps) {
  const weeks = useMemo(() => listWeeks(project.timeWindow), [project.timeWindow]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [overrideDialog, setOverrideDialog] = useState<GroupOverrideDialogState | null>(null);
  const clickTimeouts = useRef<Record<string, number>>({});
  const groupMap = useMemo(
    () => new Map(project.groups.map((group) => [group.id, group.name])),
    [project.groups]
  );
  const violationWeeks = useMemo(() => {
    const set = new Set<number>();
    for (const violation of project.violations) {
      set.add(violation.week);
    }
    return set;
  }, [project.violations]);

  useEffect(() => {
    const timeouts = clickTimeouts.current;
    return () => {
      for (const timeoutId of Object.values(timeouts)) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!overrideDialog) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOverrideDialog(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overrideDialog]);

  const chooseOverrideGroup = (workerId: string, week: number) => {
    const worker = project.workers.find((item) => item.id === workerId);
    if (!worker) {
      return;
    }
    const assignment = project.plan.assignments[workerId]?.[week] ?? "WORK";
    if (assignment !== "WORK") {
      return;
    }
    const currentGroupId =
      getWorkerEffectiveGroupForWeek(
        project,
        project.plan.assignments,
        project.plan.groupOverrides ?? {},
        workerId,
        week
      ) ?? worker.groupId;
    setOverrideDialog({
      workerId,
      week,
      selectedGroupId: currentGroupId
    });
  };

  const handleCellClick = (workerId: string, week: number) => {
    const key = `${workerId}-${week}`;
    const existing = clickTimeouts.current[key];
    if (existing) {
      window.clearTimeout(existing);
      delete clickTimeouts.current[key];
      chooseOverrideGroup(workerId, week);
      return;
    }

    clickTimeouts.current[key] = window.setTimeout(() => {
      onToggle(workerId, week);
      delete clickTimeouts.current[key];
    }, 220);
  };

  const dialogWorker = overrideDialog
    ? project.workers.find((item) => item.id === overrideDialog.workerId) ?? null
    : null;
  const dialogWeek = overrideDialog?.week ?? null;
  const dialogHomeGroupId = dialogWorker?.groupId ?? null;

  const applyOverrideDialog = () => {
    if (!overrideDialog || !dialogWorker) {
      return;
    }
    const selected = overrideDialog.selectedGroupId;
    onSetGroupOverride(
      overrideDialog.workerId,
      overrideDialog.week,
      selected === dialogWorker.groupId ? null : selected
    );
    setOverrideDialog(null);
  };

  return (
    <>
      <TableWrapper className="max-h-[70vh]">
        <Table>
          <thead className="sticky top-0 z-20">
            <tr>
              <Th className="sticky left-0 z-30 min-w-64 bg-slate-200">Worker</Th>
              {weeks.map((week) => (
                <Th
                  key={week}
                  className={cn(
                    "min-w-14 text-center",
                    violationWeeks.has(week) && "bg-red-100 text-red-800"
                  )}
                >
                  W{week}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {project.groups.map((group) => {
              const isCollapsed = collapsed[group.id] ?? false;
              const workers = project.workers.filter((worker) => worker.groupId === group.id);
              return (
                <Fragment key={group.id}>
                  <tr>
                    <Td className="sticky left-0 z-10 bg-slate-100 font-semibold">
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsed((prev) => ({ ...prev, [group.id]: !(prev[group.id] ?? false) }))
                        }
                        className="flex items-center gap-1"
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        {group.name} ({workers.length})
                      </button>
                    </Td>
                    {weeks.map((week) => (
                      <Td key={`${group.id}-${week}`} className="bg-slate-50 text-center text-xs text-slate-500">
                        {countWorkersWorkingInGroup(
                          project,
                          project.plan.assignments,
                          group.id,
                          week,
                          project.plan.groupOverrides ?? {}
                        )}
                      </Td>
                    ))}
                  </tr>

                  {!isCollapsed &&
                    workers.map((worker) => (
                      <tr key={worker.id} className={cn(selectedWorkerId === worker.id && "bg-sky-50")}>
                        <Td
                          className={cn(
                            "sticky left-0 z-10 bg-white",
                            selectedWorkerId === worker.id && "bg-sky-100"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectWorker(worker.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-0.5 text-left hover:bg-slate-100"
                          >
                            <span className="truncate">{worker.name}</span>
                            <span className="text-xs text-muted-foreground">{worker.skillIds.length} skills</span>
                          </button>
                        </Td>
                        {weeks.map((week) => {
                          const value = project.plan.assignments[worker.id]?.[week] ?? "WORK";
                          const effectiveGroupId =
                            value === "WORK"
                              ? getWorkerEffectiveGroupForWeek(
                                  project,
                                  project.plan.assignments,
                                  project.plan.groupOverrides ?? {},
                                  worker.id,
                                  week
                                )
                              : null;
                          const inLoanGroup = effectiveGroupId && effectiveGroupId !== worker.groupId;
                          const loanGroupName = inLoanGroup
                            ? groupMap.get(effectiveGroupId) ?? effectiveGroupId
                            : null;
                          return (
                            <Td key={`${worker.id}-${week}`} className="p-1">
                              <button
                                type="button"
                                onClick={() => handleCellClick(worker.id, week)}
                                title={
                                  value === "WORK"
                                    ? "Click: WORK/VACATION, Double-click: assign team for this week"
                                    : "Click to switch VACATION -> WORK"
                                }
                                className={cn(
                                  "h-8 w-full rounded-lg px-1 text-[10px] font-semibold leading-tight transition",
                                  value === "WORK"
                                    ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                                    : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                                )}
                              >
                                {value === "WORK" && loanGroupName ? `WORK (${loanGroupName})` : value}
                              </button>
                            </Td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </TableWrapper>

      {overrideDialog && dialogWorker && dialogWeek !== null && dialogHomeGroupId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOverrideDialog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Assign worker to team for week"
            className="w-full max-w-md rounded-2xl border border-border bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-base font-bold">Assign worker to team</h3>
              <div className="text-sm text-muted-foreground">
                {dialogWorker.name}, W{dialogWeek}
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">Team for this week</div>
              <Select
                value={overrideDialog.selectedGroupId}
                onChange={(event) =>
                  setOverrideDialog((prev) =>
                    prev
                      ? {
                          ...prev,
                          selectedGroupId: event.target.value
                        }
                      : prev
                  )
                }
              >
                {project.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                    {group.id === dialogHomeGroupId ? " (home)" : ""}
                  </option>
                ))}
              </Select>
              <div className="text-xs text-muted-foreground">
                If the selected team is the worker&apos;s home team, override will be removed.
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => setOverrideDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setOverrideDialog((prev) =>
                    prev
                      ? {
                          ...prev,
                          selectedGroupId: dialogHomeGroupId
                        }
                      : prev
                  )
                }
              >
                Use home team
              </Button>
              <Button onClick={applyOverrideDialog}>Apply</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
