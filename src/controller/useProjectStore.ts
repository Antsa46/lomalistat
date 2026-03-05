import { create } from "zustand";
import { recalculateDerived } from "../engine/recalc";
import {
  generatePlan as runGeneratePlan,
  generatePlanWithTransfers as runGeneratePlanWithTransfers
} from "../engine/generatePlan";
import { buildDefaultAssignments } from "../engine/constraints";
import { generateDemoProject } from "./demo-data";
import {
  createExportFilename,
  exportProjectToJson,
  importProjectFromJson
} from "./project-io";
import { createEmptyProject } from "../model/factory";
import { createId, nowIso } from "../model/id";
import type {
  AssignmentState,
  Priority,
  ProjectData,
  TimeWindow
} from "../model/types";
import { clampWeek, normalizeTimeWindow } from "../model/weeks";
import { debounce } from "../lib/utils";
import { IndexedDBRepo } from "../repository/IndexedDBRepo";

type AppPage = "wizard" | "planner";

interface CreateProjectInput {
  name: string;
  year: number;
  startWeek: number;
  endWeek: number;
}

interface ProjectStore {
  project: ProjectData | null;
  loading: boolean;
  error: string | null;
  isMagicGenerating: boolean;
  page: AppPage;
  wizardStep: number;

  initialize: () => Promise<void>;
  clearError: () => void;
  setPage: (page: AppPage) => void;
  setWizardStep: (step: number) => void;

  createProject: (input: CreateProjectInput) => void;
  updateProjectName: (name: string) => void;
  setTimeWindow: (patch: Partial<TimeWindow>) => void;

  addGroup: (name: string, minHeadcountPerWeek: number) => void;
  updateGroup: (groupId: string, patch: { name?: string; minHeadcountPerWeek?: number }) => void;
  removeGroup: (groupId: string) => void;

  addWorker: (name: string, groupId: string) => void;
  updateWorker: (workerId: string, patch: { name?: string; groupId?: string }) => void;
  removeWorker: (workerId: string) => void;
  moveWorker: (workerId: string, groupId: string) => void;

  addSkill: (name: string) => void;
  updateSkill: (skillId: string, patch: { name?: string }) => void;
  removeSkill: (skillId: string) => void;
  setWorkerSkills: (workerId: string, skillIds: string[]) => void;

  addSkillRequirement: (groupId: string, skillId: string, minPerWeek: number) => void;
  updateSkillRequirement: (
    requirementId: string,
    patch: { groupId?: string; skillId?: string; minPerWeek?: number }
  ) => void;
  removeSkillRequirement: (requirementId: string) => void;

  addRequest: (
    workerId: string,
    startWeek: number,
    endWeek: number,
    priority: Priority
  ) => void;
  updateRequest: (
    requestId: string,
    patch: { workerId?: string; startWeek?: number; endWeek?: number; priority?: Priority }
  ) => void;
  removeRequest: (requestId: string) => void;

  generatePlan: () => void;
  generatePlanWithTransfers: () => Promise<void>;
  toggleWeekAssignment: (workerId: string, week: number) => void;
  setWeekGroupOverride: (workerId: string, week: number, groupId: string | null) => void;
  recalcViolations: () => void;

  exportProject: () => { filename: string; content: string } | null;
  importProject: (jsonText: string) => Promise<void>;
  generateDemoData: (seed?: number) => Promise<void>;
  resetLocalData: () => Promise<void>;
}

const repo = new IndexedDBRepo();

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      setTimeout(resolve, 0);
      return;
    }
    window.requestAnimationFrame(() => resolve());
  });
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const persistDebounced = debounce((project: ProjectData) => {
  void repo.saveProject(project);
}, 500);

function refreshDerived(project: ProjectData): void {
  const derived = recalculateDerived(project);
  project.violations = derived.violations;
  project.unmetRequests = derived.unmetRequests;
}

export const useProjectStore = create<ProjectStore>((set, get) => {
  const mutateProject = (
    mutator: (project: ProjectData) => void,
    options: { recalc?: boolean } = {}
  ) => {
    const current = get().project;
    if (!current) {
      return;
    }
    const draft = structuredClone(current);
    mutator(draft);
    draft.project.updatedAt = nowIso();

    const shouldRecalc = options.recalc ?? true;
    if (shouldRecalc) {
      refreshDerived(draft);
    }

    set({ project: draft, error: null });
    persistDebounced(draft);
  };

  return {
    project: null,
    loading: true,
    error: null,
    isMagicGenerating: false,
    page: "wizard",
    wizardStep: 0,

    async initialize() {
      try {
        const loadedRaw = await repo.loadProject();
        const loaded = loadedRaw
          ? {
              ...loadedRaw,
              plan: {
                ...loadedRaw.plan,
                groupOverrides: loadedRaw.plan.groupOverrides ?? {}
              }
            }
          : null;
        set({
          project: loaded,
          loading: false,
          page: loaded ? "planner" : "wizard"
        });
      } catch (error) {
        set({
          loading: false,
          error: error instanceof Error ? error.message : "Loading local data failed."
        });
      }
    },

    clearError() {
      set({ error: null });
    },

    setPage(page) {
      set({ page });
    },

    setWizardStep(step) {
      set({ wizardStep: Math.max(0, Math.min(5, step)) });
    },

    createProject(input) {
      const project = createEmptyProject(input.name, input.year, input.startWeek, input.endWeek);
      set({
        project,
        page: "wizard",
        wizardStep: 0,
        error: null
      });
      persistDebounced(project);
    },

    updateProjectName(name) {
      mutateProject((project) => {
        project.project.name = name;
      }, { recalc: false });
    },

    setTimeWindow(patch) {
      mutateProject((project) => {
        project.timeWindow = normalizeTimeWindow({
          ...project.timeWindow,
          ...patch
        });
      });
    },

    addGroup(name, minHeadcountPerWeek) {
      mutateProject((project) => {
        project.groups.push({
          id: createId("grp"),
          name: name.trim() || `Group ${project.groups.length + 1}`,
          minHeadcountPerWeek: Math.max(0, Math.trunc(minHeadcountPerWeek))
        });
      });
    },

    updateGroup(groupId, patch) {
      mutateProject((project) => {
        const group = project.groups.find((item) => item.id === groupId);
        if (!group) {
          return;
        }
        if (patch.name !== undefined) {
          group.name = patch.name;
        }
        if (patch.minHeadcountPerWeek !== undefined) {
          group.minHeadcountPerWeek = Math.max(0, Math.trunc(patch.minHeadcountPerWeek));
        }
      });
    },

    removeGroup(groupId) {
      mutateProject((project) => {
        project.groups = project.groups.filter((group) => group.id !== groupId);
        project.skillRequirements = project.skillRequirements.filter(
          (requirement) => requirement.groupId !== groupId
        );

        const removedWorkerIds = new Set(
          project.workers.filter((worker) => worker.groupId === groupId).map((worker) => worker.id)
        );
        project.workers = project.workers.filter((worker) => worker.groupId !== groupId);
        project.requests = project.requests.filter((request) => !removedWorkerIds.has(request.workerId));
        for (const workerId of removedWorkerIds) {
          delete project.plan.assignments[workerId];
          delete project.plan.groupOverrides[workerId];
        }

        for (const [workerId, weekMap] of Object.entries(project.plan.groupOverrides)) {
          const filtered = Object.fromEntries(
            Object.entries(weekMap).filter(([, overrideGroupId]) => overrideGroupId !== groupId)
          );
          if (Object.keys(filtered).length === 0) {
            delete project.plan.groupOverrides[workerId];
          } else {
            project.plan.groupOverrides[workerId] = filtered;
          }
        }
      });
    },

    addWorker(name, groupId) {
      mutateProject((project) => {
        project.workers.push({
          id: createId("worker"),
          name: name.trim() || `Worker ${project.workers.length + 1}`,
          groupId,
          skillIds: []
        });
      });
    },

    updateWorker(workerId, patch) {
      mutateProject((project) => {
        const worker = project.workers.find((item) => item.id === workerId);
        if (!worker) {
          return;
        }
        if (patch.name !== undefined) {
          worker.name = patch.name;
        }
        if (patch.groupId !== undefined) {
          worker.groupId = patch.groupId;
          delete project.plan.groupOverrides[workerId];
        }
      });
    },

    removeWorker(workerId) {
      mutateProject((project) => {
        project.workers = project.workers.filter((worker) => worker.id !== workerId);
        project.requests = project.requests.filter((request) => request.workerId !== workerId);
        delete project.plan.assignments[workerId];
        delete project.plan.groupOverrides[workerId];
      });
    },

    moveWorker(workerId, groupId) {
      mutateProject((project) => {
        const worker = project.workers.find((item) => item.id === workerId);
        if (!worker) {
          return;
        }
        worker.groupId = groupId;
        delete project.plan.groupOverrides[workerId];
      });
    },

    addSkill(name) {
      mutateProject((project) => {
        project.skills.push({
          id: createId("skill"),
          name: name.trim() || `Skill ${project.skills.length + 1}`
        });
      });
    },

    updateSkill(skillId, patch) {
      mutateProject((project) => {
        const skill = project.skills.find((item) => item.id === skillId);
        if (!skill) {
          return;
        }
        if (patch.name !== undefined) {
          skill.name = patch.name;
        }
      });
    },

    removeSkill(skillId) {
      mutateProject((project) => {
        project.skills = project.skills.filter((skill) => skill.id !== skillId);
        project.skillRequirements = project.skillRequirements.filter(
          (requirement) => requirement.skillId !== skillId
        );
        project.workers = project.workers.map((worker) => ({
          ...worker,
          skillIds: worker.skillIds.filter((id) => id !== skillId)
        }));
      });
    },

    setWorkerSkills(workerId, skillIds) {
      mutateProject((project) => {
        const worker = project.workers.find((item) => item.id === workerId);
        if (!worker) {
          return;
        }
        const validSkillIds = new Set(project.skills.map((skill) => skill.id));
        worker.skillIds = [...new Set(skillIds)].filter((skillId) => validSkillIds.has(skillId)).sort();
      });
    },

    addSkillRequirement(groupId, skillId, minPerWeek) {
      mutateProject((project) => {
        project.skillRequirements.push({
          id: createId("sreq"),
          groupId,
          skillId,
          minPerWeek: Math.max(0, Math.trunc(minPerWeek))
        });
      });
    },

    updateSkillRequirement(requirementId, patch) {
      mutateProject((project) => {
        const requirement = project.skillRequirements.find((item) => item.id === requirementId);
        if (!requirement) {
          return;
        }
        if (patch.groupId !== undefined) {
          requirement.groupId = patch.groupId;
        }
        if (patch.skillId !== undefined) {
          requirement.skillId = patch.skillId;
        }
        if (patch.minPerWeek !== undefined) {
          requirement.minPerWeek = Math.max(0, Math.trunc(patch.minPerWeek));
        }
      });
    },

    removeSkillRequirement(requirementId) {
      mutateProject((project) => {
        project.skillRequirements = project.skillRequirements.filter(
          (requirement) => requirement.id !== requirementId
        );
      });
    },

    addRequest(workerId, startWeek, endWeek, priority) {
      mutateProject((project) => {
        const normalizedStart = clampWeek(Math.min(startWeek, endWeek));
        const normalizedEnd = clampWeek(Math.max(startWeek, endWeek));
        project.requests.push({
          id: createId("request"),
          workerId,
          startWeek: normalizedStart,
          endWeek: normalizedEnd,
          priority
        });
      });
    },

    updateRequest(requestId, patch) {
      mutateProject((project) => {
        const request = project.requests.find((item) => item.id === requestId);
        if (!request) {
          return;
        }
        if (patch.workerId !== undefined) {
          request.workerId = patch.workerId;
        }
        if (patch.startWeek !== undefined) {
          request.startWeek = clampWeek(patch.startWeek);
        }
        if (patch.endWeek !== undefined) {
          request.endWeek = clampWeek(patch.endWeek);
        }
        if (request.endWeek < request.startWeek) {
          [request.startWeek, request.endWeek] = [request.endWeek, request.startWeek];
        }
        if (patch.priority !== undefined) {
          request.priority = patch.priority;
        }
      });
    },

    removeRequest(requestId) {
      mutateProject((project) => {
        project.requests = project.requests.filter((request) => request.id !== requestId);
      });
    },

    generatePlan() {
      mutateProject(
        (project) => {
          const generated = runGeneratePlan(project);
          project.plan = generated.plan;
          project.violations = generated.violations;
          project.unmetRequests = generated.unmetRequests;
        },
        { recalc: false }
      );
      set({ page: "planner" });
    },

    async generatePlanWithTransfers() {
      if (!get().project) {
        return;
      }

      const startedAt = Date.now();
      set({ isMagicGenerating: true, error: null });
      await nextFrame();
      await waitMs(120);

      try {
        mutateProject(
          (project) => {
            const generated = runGeneratePlanWithTransfers(project);
            project.plan = generated.plan;
            project.violations = generated.violations;
            project.unmetRequests = generated.unmetRequests;
          },
          { recalc: false }
        );
        set({ page: "planner" });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Magic generation failed."
        });
      } finally {
        const elapsed = Date.now() - startedAt;
        const minVisibleMs = 1100;
        if (elapsed < minVisibleMs) {
          await waitMs(minVisibleMs - elapsed);
        }
        set({ isMagicGenerating: false });
      }
    },

    toggleWeekAssignment(workerId, week) {
      mutateProject(
        (project) => {
          project.plan.assignments = project.plan.assignments ?? buildDefaultAssignments(project);
          project.plan.groupOverrides = project.plan.groupOverrides ?? {};
          project.plan.assignments[workerId] ??= {};
          const current = project.plan.assignments[workerId][week] ?? "WORK";
          const next: AssignmentState = current === "WORK" ? "VACATION" : "WORK";
          project.plan.assignments[workerId][week] = next;
          if (next === "VACATION") {
            delete project.plan.groupOverrides[workerId]?.[week];
            if (
              project.plan.groupOverrides[workerId] &&
              Object.keys(project.plan.groupOverrides[workerId]).length === 0
            ) {
              delete project.plan.groupOverrides[workerId];
            }
          }
          refreshDerived(project);
        },
        { recalc: false }
      );
    },

    setWeekGroupOverride(workerId, week, groupId) {
      mutateProject(
        (project) => {
          project.plan.groupOverrides = project.plan.groupOverrides ?? {};
          const worker = project.workers.find((item) => item.id === workerId);
          if (!worker) {
            return;
          }
          if ((project.plan.assignments[workerId]?.[week] ?? "WORK") !== "WORK") {
            return;
          }

          if (!groupId || groupId === worker.groupId) {
            delete project.plan.groupOverrides[workerId]?.[week];
            if (
              project.plan.groupOverrides[workerId] &&
              Object.keys(project.plan.groupOverrides[workerId]).length === 0
            ) {
              delete project.plan.groupOverrides[workerId];
            }
          } else {
            project.plan.groupOverrides[workerId] ??= {};
            project.plan.groupOverrides[workerId][week] = groupId;
          }
          refreshDerived(project);
        },
        { recalc: false }
      );
    },

    recalcViolations() {
      mutateProject((project) => {
        refreshDerived(project);
      }, { recalc: false });
    },

    exportProject() {
      const project = get().project;
      if (!project) {
        return null;
      }
      return {
        filename: createExportFilename(project),
        content: exportProjectToJson(project)
      };
    },

    async importProject(jsonText) {
      try {
        const imported = importProjectFromJson(jsonText);
        set({
          project: imported,
          page: "planner",
          wizardStep: 0,
          error: null
        });
        await repo.saveProject(imported);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Import failed."
        });
      }
    },

    async generateDemoData(seed = 1337) {
      const demo = generateDemoProject(seed);
      set({
        project: demo,
        page: "planner",
        wizardStep: 5,
        error: null
      });
      await repo.saveProject(demo);
    },

    async resetLocalData() {
      await repo.clear();
      const verify = await repo.loadProject();
      set({
        project: null,
        page: "wizard",
        wizardStep: 0,
        error: verify ? "Failed to clear local data." : null
      });
    }
  };
});
