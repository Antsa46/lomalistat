import type { ProjectData } from "../model/types";
import type { ProjectRepository } from "./ProjectRepository";

export class InMemoryRepo implements ProjectRepository {
  private project: ProjectData | null = null;

  async loadProject(): Promise<ProjectData | null> {
    return this.project ? structuredClone(this.project) : null;
  }

  async saveProject(project: ProjectData): Promise<void> {
    this.project = structuredClone(project);
  }

  async clear(): Promise<void> {
    this.project = null;
  }
}

