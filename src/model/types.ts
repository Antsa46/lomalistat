export type SchemaVersion = 1;
export type AssignmentState = "WORK" | "VACATION";
export type Priority = 1 | 2 | 3;
export type GroupOverrides = Record<string, Record<number, string>>;

export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeWindow {
  year: number;
  startWeek: number;
  endWeek: number;
  includeMonths?: number[];
}

export interface Group {
  id: string;
  name: string;
  minHeadcountPerWeek: number;
}

export interface Skill {
  id: string;
  name: string;
}

export interface SkillRequirement {
  id: string;
  groupId: string;
  skillId: string;
  minPerWeek: number;
}

export interface Worker {
  id: string;
  name: string;
  groupId: string;
  skillIds: string[];
}

export interface VacationRequest {
  id: string;
  workerId: string;
  startWeek: number;
  endWeek: number;
  priority: Priority;
}

export interface Plan {
  assignments: Record<string, Record<number, AssignmentState>>;
  groupOverrides: GroupOverrides;
  generatedAt: string;
  notes?: string;
}

export interface Violation {
  id: string;
  week: number;
  groupId: string;
  type: "HEADCOUNT" | "SKILL";
  skillId?: string;
  required: number;
  actual: number;
  missing: number;
}

export interface UnmetRequest {
  id: string;
  requestId: string;
  workerId: string;
  week: number;
  reasonType: "HEADCOUNT" | "SKILL";
  groupId: string;
  skillId?: string;
  required: number;
  actual: number;
  missing: number;
}

export interface ProjectData {
  schemaVersion: SchemaVersion;
  project: ProjectMeta;
  timeWindow: TimeWindow;
  groups: Group[];
  skills: Skill[];
  skillRequirements: SkillRequirement[];
  workers: Worker[];
  requests: VacationRequest[];
  plan: Plan;
  violations: Violation[];
  unmetRequests: UnmetRequest[];
}
