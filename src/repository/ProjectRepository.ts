import type { ProjectData } from "../model/types";

export interface ProjectRepository {
  loadProject(): Promise<ProjectData | null>;
  saveProject(project: ProjectData): Promise<void>;
  clear(): Promise<void>;
}

