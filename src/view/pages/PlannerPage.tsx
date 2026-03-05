import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Sparkles, TriangleAlert } from "lucide-react";
import { useProjectStore } from "../../controller/useProjectStore";
import { listWeeks } from "../../model/weeks";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardDescription, CardTitle } from "../../components/ui/card";
import { PlannerGrid } from "../components/PlannerGrid";
import { WorkerDetailsPanel } from "../components/WorkerDetailsPanel";
import { ViolationsPanel } from "../components/ViolationsPanel";

export function PlannerPage() {
  const project = useProjectStore((state) => state.project);
  const toggleWeekAssignment = useProjectStore((state) => state.toggleWeekAssignment);
  const setWeekGroupOverride = useProjectStore((state) => state.setWeekGroupOverride);
  const generatePlan = useProjectStore((state) => state.generatePlan);
  const generatePlanWithTransfers = useProjectStore((state) => state.generatePlanWithTransfers);
  const isMagicGenerating = useProjectStore((state) => state.isMagicGenerating);
  const recalcViolations = useProjectStore((state) => state.recalcViolations);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  useEffect(() => {
    if (!project) {
      setSelectedWorkerId(null);
      return;
    }
    if (project.workers.length === 0) {
      setSelectedWorkerId(null);
      return;
    }
    const exists = selectedWorkerId
      ? project.workers.some((worker) => worker.id === selectedWorkerId)
      : false;
    if (!exists) {
      setSelectedWorkerId(project.workers[0].id);
    }
  }, [project, selectedWorkerId]);

  const stats = useMemo(() => {
    if (!project) {
      return null;
    }
    const weeks = listWeeks(project.timeWindow);
    const totalCells = project.workers.length * weeks.length;
    let vacationCells = 0;
    for (const worker of project.workers) {
      for (const week of weeks) {
        if (project.plan.assignments[worker.id]?.[week] === "VACATION") {
          vacationCells += 1;
        }
      }
    }
    return {
      weeks: weeks.length,
      totalCells,
      vacationCells
    };
  }, [project]);

  if (!project) {
    return (
      <Card>
        <CardTitle>No project loaded</CardTitle>
        <CardDescription>Import JSON, create a project, or generate demo-data first.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4 xl:col-start-1">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Planner / {project.project.name}</CardTitle>
              <CardDescription>
                {project.timeWindow.year} - weeks {project.timeWindow.startWeek}..{project.timeWindow.endWeek}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => generatePlan()}>
                <CalendarCheck2 size={14} className="mr-1" /> Regenerate
              </Button>
              <Button onClick={() => void generatePlanWithTransfers()} disabled={isMagicGenerating}>
                <Sparkles size={14} className="mr-1" />
                {isMagicGenerating ? "Generating..." : "Magic regenerate"}
              </Button>
              <Button variant="outline" onClick={() => recalcViolations()}>
                <TriangleAlert size={14} className="mr-1" /> Recalc
              </Button>
            </div>
          </div>
          {stats && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Click cell = WORK/VACATION. Double-click WORK cell = assign worker to another team for that week.
              </div>
              <div className="text-xs text-muted-foreground">
                Magic regenerate also tries automatic cross-team backfills to fulfill more requests.
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Workers: {project.workers.length}</Badge>
                <Badge variant="outline">Weeks: {stats.weeks}</Badge>
                <Badge variant="outline">Vacation cells: {stats.vacationCells}</Badge>
                <Badge variant={project.violations.length ? "danger" : "success"}>
                  Violations: {project.violations.length}
                </Badge>
                <Badge variant={project.unmetRequests.length ? "warning" : "success"}>
                  Unmet requests: {project.unmetRequests.length}
                </Badge>
              </div>
            </div>
          )}
        </Card>

        <PlannerGrid
          project={project}
          onToggle={toggleWeekAssignment}
          onSetGroupOverride={setWeekGroupOverride}
          selectedWorkerId={selectedWorkerId}
          onSelectWorker={setSelectedWorkerId}
        />
      </div>

      <div className="space-y-4 xl:col-start-2">
        <WorkerDetailsPanel project={project} workerId={selectedWorkerId} />
        <ViolationsPanel
          project={project}
          onSuggestAssign={setWeekGroupOverride}
          onSelectWorker={setSelectedWorkerId}
          selectedWorkerId={selectedWorkerId}
        />
      </div>
    </div>
  );
}
