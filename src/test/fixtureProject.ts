import type { ProjectData } from "../model/types";

export function createFixtureProject(): ProjectData {
  return {
    schemaVersion: 1,
    project: {
      id: "fixture-project",
      name: "Fixture",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    timeWindow: {
      year: 2026,
      startWeek: 1,
      endWeek: 4
    },
    groups: [
      {
        id: "g1",
        name: "Group 1",
        minHeadcountPerWeek: 2
      }
    ],
    skills: [
      { id: "s1", name: "Skill 1" },
      { id: "s2", name: "Skill 2" }
    ],
    skillRequirements: [
      {
        id: "sr1",
        groupId: "g1",
        skillId: "s1",
        minPerWeek: 1
      }
    ],
    workers: [
      {
        id: "w1",
        name: "Worker 1",
        groupId: "g1",
        skillIds: ["s1"]
      },
      {
        id: "w2",
        name: "Worker 2",
        groupId: "g1",
        skillIds: ["s2"]
      },
      {
        id: "w3",
        name: "Worker 3",
        groupId: "g1",
        skillIds: ["s1", "s2"]
      }
    ],
    requests: [
      {
        id: "r1",
        workerId: "w1",
        startWeek: 1,
        endWeek: 2,
        priority: 3
      },
      {
        id: "r2",
        workerId: "w2",
        startWeek: 2,
        endWeek: 3,
        priority: 2
      },
      {
        id: "r3",
        workerId: "w3",
        startWeek: 3,
        endWeek: 4,
        priority: 1
      }
    ],
    plan: {
      assignments: {},
      groupOverrides: {},
      generatedAt: "2026-01-01T00:00:00.000Z"
    },
    violations: [],
    unmetRequests: []
  };
}
