import Dexie, { type Table } from "dexie";
import type { ProjectData } from "../model/types";
import type { ProjectRepository } from "./ProjectRepository";

interface ProjectRecord {
  id: string;
  updatedAt: string;
  payload: ProjectData;
}

class LocalDb extends Dexie {
  projects!: Table<ProjectRecord, string>;

  constructor() {
    super("lomalistat-db");
    this.version(1).stores({
      projects: "&id, updatedAt"
    });
  }
}

const db = new LocalDb();

export class IndexedDBRepo implements ProjectRepository {
  async loadProject(): Promise<ProjectData | null> {
    const latest = await db.projects.orderBy("updatedAt").last();
    return latest?.payload ?? null;
  }

  async saveProject(project: ProjectData): Promise<void> {
    await db.projects.put({
      id: project.project.id,
      updatedAt: project.project.updatedAt,
      payload: project
    });
  }

  async clear(): Promise<void> {
    await db.delete();
    await db.open();
  }
}
