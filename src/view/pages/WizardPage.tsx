import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useProjectStore } from "../../controller/useProjectStore";
import { listWeeks } from "../../model/weeks";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardDescription, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { NumberInput } from "../../components/ui/number-input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Stepper } from "../components/Stepper";

const steps = [
  "Project + weeks",
  "Groups",
  "Workers",
  "Skills + requirements",
  "Requests",
  "Generate"
];

export function WizardPage() {
  const project = useProjectStore((state) => state.project);
  const wizardStep = useProjectStore((state) => state.wizardStep);
  const setWizardStep = useProjectStore((state) => state.setWizardStep);
  const setPage = useProjectStore((state) => state.setPage);

  const createProject = useProjectStore((state) => state.createProject);
  const updateProjectName = useProjectStore((state) => state.updateProjectName);
  const setTimeWindow = useProjectStore((state) => state.setTimeWindow);
  const addGroup = useProjectStore((state) => state.addGroup);
  const updateGroup = useProjectStore((state) => state.updateGroup);
  const removeGroup = useProjectStore((state) => state.removeGroup);
  const addWorker = useProjectStore((state) => state.addWorker);
  const updateWorker = useProjectStore((state) => state.updateWorker);
  const removeWorker = useProjectStore((state) => state.removeWorker);
  const addSkill = useProjectStore((state) => state.addSkill);
  const updateSkill = useProjectStore((state) => state.updateSkill);
  const removeSkill = useProjectStore((state) => state.removeSkill);
  const setWorkerSkills = useProjectStore((state) => state.setWorkerSkills);
  const addSkillRequirement = useProjectStore((state) => state.addSkillRequirement);
  const updateSkillRequirement = useProjectStore((state) => state.updateSkillRequirement);
  const removeSkillRequirement = useProjectStore((state) => state.removeSkillRequirement);
  const addRequest = useProjectStore((state) => state.addRequest);
  const updateRequest = useProjectStore((state) => state.updateRequest);
  const removeRequest = useProjectStore((state) => state.removeRequest);
  const generatePlan = useProjectStore((state) => state.generatePlan);
  const generatePlanWithTransfers = useProjectStore((state) => state.generatePlanWithTransfers);
  const isMagicGenerating = useProjectStore((state) => state.isMagicGenerating);

  const [newProjectName, setNewProjectName] = useState("Lomaprojekti");
  const [newProjectYear, setNewProjectYear] = useState(new Date().getFullYear());
  const [newProjectStartWeek, setNewProjectStartWeek] = useState(1);
  const [newProjectEndWeek, setNewProjectEndWeek] = useState(52);

  const [groupName, setGroupName] = useState("");
  const [groupMinHeadcount, setGroupMinHeadcount] = useState(8);

  const [workerName, setWorkerName] = useState("");
  const [workerGroupId, setWorkerGroupId] = useState("");
  const [workerForSkills, setWorkerForSkills] = useState("");

  const [skillName, setSkillName] = useState("");
  const [reqGroupId, setReqGroupId] = useState("");
  const [reqSkillId, setReqSkillId] = useState("");
  const [reqMin, setReqMin] = useState(2);
  const [reqMessage, setReqMessage] = useState<string | null>(null);
  const [reqMessageType, setReqMessageType] = useState<"success" | "error">("success");

  const [requestWorkerId, setRequestWorkerId] = useState("");
  const [requestStartWeek, setRequestStartWeek] = useState(1);
  const [requestEndWeek, setRequestEndWeek] = useState(1);
  const [requestPriority, setRequestPriority] = useState<1 | 2 | 3>(2);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingWorkerId, setEditingWorkerId] = useState("");
  const [editingStartWeek, setEditingStartWeek] = useState(1);
  const [editingEndWeek, setEditingEndWeek] = useState(1);
  const [editingPriority, setEditingPriority] = useState<1 | 2 | 3>(2);

  const weeks = useMemo(() => (project ? listWeeks(project.timeWindow) : []), [project]);

  const requestSummary = useMemo(() => {
    if (!project) {
      return {
        totalRequestWeeks: 0,
        grantedWeeks: 0,
        fulfillmentPercent: 0,
        problemWeeks: []
      };
    }
    const totalRequestWeeks = project.requests.reduce(
      (sum, request) => sum + (request.endWeek - request.startWeek + 1),
      0
    );
    let grantedWeeks = 0;
    for (const request of project.requests) {
      for (let week = request.startWeek; week <= request.endWeek; week += 1) {
        const assignment = project.plan.assignments[request.workerId]?.[week] ?? "WORK";
        if (assignment === "VACATION") {
          grantedWeeks += 1;
        }
      }
    }
    const fulfillmentPercent =
      totalRequestWeeks === 0 ? 0 : Math.round((grantedWeeks / totalRequestWeeks) * 100);
    const problemWeeks = [...new Set([...project.violations.map((item) => item.week)])].sort(
      (a, b) => a - b
    );
    return {
      totalRequestWeeks,
      grantedWeeks,
      fulfillmentPercent,
      problemWeeks
    };
  }, [project]);

  useEffect(() => {
    if (!project) {
      return;
    }
    if (!reqGroupId && project.groups.length > 0) {
      setReqGroupId(project.groups[0].id);
    }
  }, [project, reqGroupId]);

  useEffect(() => {
    if (!project) {
      return;
    }
    if (!reqSkillId && project.skills.length > 0) {
      setReqSkillId(project.skills[0].id);
    }
  }, [project, reqSkillId]);

  if (!project) {
    return (
      <div className="space-y-4">
        <Card className="space-y-4">
          <CardTitle>Create project</CardTitle>
          <CardDescription>
            Start with name + year + week range. Data is stored only in local IndexedDB.
          </CardDescription>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="new-name">Project name</Label>
              <Input id="new-name" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-year">Year</Label>
              <NumberInput
                id="new-year"
                min={2020}
                max={2100}
                value={newProjectYear}
                onValueChange={setNewProjectYear}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-start">Start week</Label>
              <NumberInput
                id="new-start"
                min={1}
                max={53}
                value={newProjectStartWeek}
                onValueChange={setNewProjectStartWeek}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-end">End week</Label>
              <NumberInput
                id="new-end"
                min={1}
                max={53}
                value={newProjectEndWeek}
                onValueChange={setNewProjectEndWeek}
              />
            </div>
          </div>
          <Button
            className="w-full md:w-auto"
            onClick={() =>
              createProject({
                name: newProjectName,
                year: newProjectYear,
                startWeek: newProjectStartWeek,
                endWeek: newProjectEndWeek
              })
            }
          >
            Create project
          </Button>
        </Card>
      </div>
    );
  }

  const selectedWorker = project.workers.find((worker) => worker.id === workerForSkills);

  const renderStep = () => {
    if (wizardStep === 0) {
      return (
        <Card className="space-y-4">
          <CardTitle>Project + time window</CardTitle>
          <CardDescription>Edit project name, year and weeks.</CardDescription>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={project.project.name}
                onChange={(e) => updateProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="year">Year</Label>
              <NumberInput
                id="year"
                value={project.timeWindow.year}
                onValueChange={(year) => setTimeWindow({ year })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="start">Start week</Label>
              <NumberInput
                id="start"
                min={1}
                max={53}
                value={project.timeWindow.startWeek}
                onValueChange={(startWeek) => setTimeWindow({ startWeek })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="end">End week</Label>
              <NumberInput
                id="end"
                min={1}
                max={53}
                value={project.timeWindow.endWeek}
                onValueChange={(endWeek) => setTimeWindow({ endWeek })}
              />
            </div>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 text-sm">
            <div className="font-semibold">Week count: {weeks.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Weeks: {weeks.join(", ")}</div>
          </div>
        </Card>
      );
    }

    if (wizardStep === 1) {
      return (
        <Card className="space-y-4">
          <CardTitle>Groups</CardTitle>
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={groupName} placeholder="Group name" onChange={(e) => setGroupName(e.target.value)} />
            <NumberInput
              min={0}
              value={groupMinHeadcount}
              onValueChange={setGroupMinHeadcount}
            />
            <Button
              onClick={() => {
                addGroup(groupName, groupMinHeadcount);
                setGroupName("");
              }}
            >
              Add group
            </Button>
          </div>
          <div className="space-y-2">
            {project.groups.map((group) => (
              <div key={group.id} className="grid gap-2 rounded-xl border border-border p-2 md:grid-cols-[1fr_120px_100px]">
                <Input
                  value={group.name}
                  onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                />
                <NumberInput
                  value={group.minHeadcountPerWeek}
                  onValueChange={(minHeadcountPerWeek) =>
                    updateGroup(group.id, { minHeadcountPerWeek })
                  }
                />
                <Button variant="danger" onClick={() => removeGroup(group.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (wizardStep === 2) {
      return (
        <Card className="space-y-4">
          <CardTitle>Workers</CardTitle>
          {project.groups.length === 0 && (
            <div className="rounded-xl bg-amber-50 p-2 text-amber-800">
              Add at least one group first.
            </div>
          )}
          {project.groups.length > 0 && (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px]">
              <Input value={workerName} placeholder="Worker name" onChange={(e) => setWorkerName(e.target.value)} />
              <Select
                value={workerGroupId || project.groups[0].id}
                onChange={(e) => setWorkerGroupId(e.target.value)}
              >
                {project.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
              <Button
                onClick={() => {
                  addWorker(workerName, workerGroupId || project.groups[0].id);
                  setWorkerName("");
                  if (!workerForSkills && project.workers.length > 0) {
                    setWorkerForSkills(project.workers[0].id);
                  }
                }}
              >
                Add worker
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {project.workers.map((worker) => (
              <div key={worker.id} className="grid gap-2 rounded-xl border border-border p-2 md:grid-cols-[1fr_1fr_100px]">
                <Input value={worker.name} onChange={(e) => updateWorker(worker.id, { name: e.target.value })} />
                <Select
                  value={worker.groupId}
                  onChange={(e) => updateWorker(worker.id, { groupId: e.target.value })}
                >
                  {project.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
                <Button variant="danger" onClick={() => removeWorker(worker.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      );
    }

    if (wizardStep === 3) {
      return (
        <Card className="space-y-4">
          <CardTitle>Skills + requirements</CardTitle>
          <div className="grid gap-3 md:grid-cols-[1fr_140px]">
            <Input value={skillName} placeholder="Skill name" onChange={(e) => setSkillName(e.target.value)} />
            <Button
              onClick={() => {
                addSkill(skillName);
                setSkillName("");
              }}
            >
              Add skill
            </Button>
          </div>

          <div className="space-y-2">
            {project.skills.map((skill) => (
              <div key={skill.id} className="grid gap-2 rounded-xl border border-border p-2 md:grid-cols-[1fr_100px]">
                <Input value={skill.name} onChange={(e) => updateSkill(skill.id, { name: e.target.value })} />
                <Button variant="danger" onClick={() => removeSkill(skill.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-sm font-semibold">Set worker skills</div>
            <Select
              value={workerForSkills}
              onChange={(e) => setWorkerForSkills(e.target.value)}
              className="mb-2"
            >
              <option value="">Select worker</option>
              {project.workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </Select>
            {selectedWorker && (
              <div className="grid gap-2 md:grid-cols-3">
                {project.skills.map((skill) => {
                  const checked = selectedWorker.skillIds.includes(skill.id);
                  return (
                    <label key={skill.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedWorker.skillIds, skill.id]
                            : selectedWorker.skillIds.filter((id) => id !== skill.id);
                          setWorkerSkills(selectedWorker.id, next);
                        }}
                      />
                      {skill.name}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 text-sm font-semibold">Skill requirements per group</div>
            <div className="grid gap-2 md:grid-cols-4">
              <Select value={reqGroupId} onChange={(e) => setReqGroupId(e.target.value)}>
                <option value="">Group</option>
                {project.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
              <Select value={reqSkillId} onChange={(e) => setReqSkillId(e.target.value)}>
                <option value="">Skill</option>
                {project.skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </Select>
              <NumberInput min={0} value={reqMin} onValueChange={setReqMin} />
              <Button
                onClick={() => {
                  if (!reqGroupId || !reqSkillId) {
                    setReqMessageType("error");
                    setReqMessage("Select both group and skill first.");
                    return;
                  }
                  const existing = project.skillRequirements.find(
                    (requirement) =>
                      requirement.groupId === reqGroupId && requirement.skillId === reqSkillId
                  );
                  if (existing) {
                    updateSkillRequirement(existing.id, { minPerWeek: reqMin });
                    setReqMessageType("success");
                    setReqMessage("Requirement updated on the existing row.");
                    return;
                  }
                  addSkillRequirement(reqGroupId, reqSkillId, reqMin);
                  setReqMessageType("success");
                  setReqMessage("Requirement added. It applies to all weeks.");
                }}
              >
                Add req
              </Button>
            </div>
            {reqMessage && (
              <div
                className={
                  reqMessageType === "success"
                    ? "mt-2 rounded-lg bg-green-50 p-2 text-xs text-green-800"
                    : "mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800"
                }
              >
                {reqMessage}
              </div>
            )}

            <div className="mt-2 space-y-2">
              {project.skillRequirements.map((requirement) => (
                <div
                  key={requirement.id}
                  className="grid gap-2 rounded-xl border border-border p-2 md:grid-cols-[1fr_1fr_100px_100px]"
                >
                  <Select
                    value={requirement.groupId}
                    onChange={(e) => updateSkillRequirement(requirement.id, { groupId: e.target.value })}
                  >
                    {project.groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={requirement.skillId}
                    onChange={(e) => updateSkillRequirement(requirement.id, { skillId: e.target.value })}
                  >
                    {project.skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </Select>
                  <NumberInput
                    value={requirement.minPerWeek}
                    onValueChange={(minPerWeek) =>
                      updateSkillRequirement(requirement.id, { minPerWeek })
                    }
                  />
                  <Button variant="danger" onClick={() => removeSkillRequirement(requirement.id)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      );
    }

    if (wizardStep === 4) {
      return (
        <Card className="space-y-4">
          <CardTitle>Vacation requests</CardTitle>
          <div className="grid gap-2 md:grid-cols-[1.5fr_120px_120px_120px_120px]">
            <Select value={requestWorkerId} onChange={(e) => setRequestWorkerId(e.target.value)}>
              <option value="">Worker</option>
              {project.workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </Select>
            <NumberInput
              min={project.timeWindow.startWeek}
              max={project.timeWindow.endWeek}
              value={requestStartWeek}
              onValueChange={setRequestStartWeek}
            />
            <NumberInput
              min={project.timeWindow.startWeek}
              max={project.timeWindow.endWeek}
              value={requestEndWeek}
              onValueChange={setRequestEndWeek}
            />
            <Select
              value={String(requestPriority)}
              onChange={(e) => setRequestPriority(Number(e.target.value) as 1 | 2 | 3)}
            >
              <option value="1">Priority 1 (highest)</option>
              <option value="2">Priority 2</option>
              <option value="3">Priority 3 (lowest)</option>
            </Select>
            <Button
              onClick={() => {
                if (!requestWorkerId) {
                  return;
                }
                addRequest(requestWorkerId, requestStartWeek, requestEndWeek, requestPriority);
                setRequestPriority(2);
              }}
            >
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {project.requests.map((request) => {
              const workerName =
                project.workers.find((worker) => worker.id === request.workerId)?.name ??
                request.workerId;

              const isEditing = editingRequestId === request.id;
              return (
                <div key={request.id} className="rounded-xl border border-border p-2">
                  {!isEditing && (
                    <div className="grid gap-2 md:grid-cols-[1fr_220px_120px_120px]">
                      <button
                        type="button"
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => {
                          setEditingRequestId(request.id);
                          setEditingWorkerId(request.workerId);
                          setEditingStartWeek(request.startWeek);
                          setEditingEndWeek(request.endWeek);
                          setEditingPriority(request.priority);
                        }}
                      >
                        {workerName}
                      </button>
                      <div>
                        W{request.startWeek}-W{request.endWeek}
                      </div>
                      <Badge variant="outline">P{request.priority}</Badge>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (editingRequestId === request.id) {
                            setEditingRequestId(null);
                          }
                          removeRequest(request.id);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  {isEditing && (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-[1.5fr_120px_120px_120px_120px]">
                        <Select value={editingWorkerId} onChange={(e) => setEditingWorkerId(e.target.value)}>
                          {project.workers.map((worker) => (
                            <option key={worker.id} value={worker.id}>
                              {worker.name}
                            </option>
                          ))}
                        </Select>
                        <NumberInput
                          min={project.timeWindow.startWeek}
                          max={project.timeWindow.endWeek}
                          value={editingStartWeek}
                          onValueChange={setEditingStartWeek}
                        />
                        <NumberInput
                          min={project.timeWindow.startWeek}
                          max={project.timeWindow.endWeek}
                          value={editingEndWeek}
                          onValueChange={setEditingEndWeek}
                        />
                        <Select
                          value={String(editingPriority)}
                          onChange={(e) => setEditingPriority(Number(e.target.value) as 1 | 2 | 3)}
                        >
                          <option value="1">Priority 1 (highest)</option>
                          <option value="2">Priority 2</option>
                          <option value="3">Priority 3 (lowest)</option>
                        </Select>
                        <Button
                          onClick={() => {
                            updateRequest(request.id, {
                              workerId: editingWorkerId,
                              startWeek: editingStartWeek,
                              endWeek: editingEndWeek,
                              priority: editingPriority
                            });
                            setEditingRequestId(null);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setEditingRequestId(null)}>
                          Cancel
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setEditingRequestId(null);
                            removeRequest(request.id);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      );
    }

    return (
        <Card className="space-y-4">
          <CardTitle>Generate list</CardTitle>
          <CardDescription>
            Deterministic heuristic: priority 1 to 2 to 3, stable by request id.
          </CardDescription>
        <div className="rounded-xl bg-slate-100 p-3 text-xs text-muted-foreground">
          Normal generate uses only WORK/VACATION toggles. Magic generate also attempts automatic
          cross-team backfills for the affected weeks.
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-xl bg-slate-100 p-3">
            <div className="text-sm text-muted-foreground">Request fulfillment</div>
            <div className="text-2xl font-bold">{requestSummary.fulfillmentPercent}%</div>
            <div className="text-xs text-muted-foreground">
              granted {requestSummary.grantedWeeks} / requested {requestSummary.totalRequestWeeks} weeks
            </div>
          </div>
          <div className="rounded-xl bg-slate-100 p-3">
            <div className="text-sm text-muted-foreground">Current issues</div>
            <div className="text-2xl font-bold">
              {project.unmetRequests.length} unmet / {project.violations.length} violations
            </div>
            <div className="text-xs text-muted-foreground">
              Problem weeks:{" "}
              {requestSummary.problemWeeks.length ? requestSummary.problemWeeks.join(", ") : "none"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => generatePlan()}>
            <Sparkles size={14} className="mr-1" /> Generate lomalista
          </Button>
          <Button onClick={() => void generatePlanWithTransfers()} disabled={isMagicGenerating}>
            <Sparkles size={14} className="mr-1" />
            {isMagicGenerating ? "Generating..." : "Magic generate (with transfers)"}
          </Button>
          <Button variant="outline" onClick={() => setPage("planner")}>
            Go to planner
          </Button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Stepper steps={steps} current={wizardStep} onStepChange={setWizardStep} />
      {renderStep()}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)} disabled={wizardStep === 0}>
          <ArrowLeft size={14} className="mr-1" /> Previous
        </Button>
        <Button variant="outline" onClick={() => setWizardStep(wizardStep + 1)} disabled={wizardStep >= 5}>
          Next <ArrowRight size={14} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
