import { generatePlan, generatePlanWithTransfers } from "./generatePlan";
import { createFixtureProject } from "../test/fixtureProject";
import type { ProjectData } from "../model/types";

function stableResult(result: ReturnType<typeof generatePlan>) {
  return {
    assignments: result.plan.assignments,
    groupOverrides: result.plan.groupOverrides,
    violations: result.violations,
    unmetRequests: result.unmetRequests
  };
}

describe("generatePlan", () => {
  it("is deterministic for same input", () => {
    const project = createFixtureProject();
    const first = generatePlan(structuredClone(project));
    const second = generatePlan(structuredClone(project));
    expect(stableResult(first)).toEqual(stableResult(second));
  });

  it("processes priority 1 before priority 3 when requests conflict", () => {
    const project = createFixtureProject();
    project.requests = [
      {
        id: "r-high",
        workerId: "w1",
        startWeek: 1,
        endWeek: 1,
        priority: 1
      },
      {
        id: "r-low",
        workerId: "w3",
        startWeek: 1,
        endWeek: 1,
        priority: 3
      }
    ];

    const result = generatePlan(project);

    expect(result.plan.assignments.w1[1]).toBe("VACATION");
    expect(result.plan.assignments.w3[1]).toBe("WORK");
    expect(result.unmetRequests.some((item) => item.requestId === "r-low" && item.week === 1)).toBe(true);
  });

  it("magic generation is deterministic for same input", () => {
    const project = createFixtureProject();
    const first = generatePlanWithTransfers(structuredClone(project));
    const second = generatePlanWithTransfers(structuredClone(project));
    expect(stableResult(first)).toEqual(stableResult(second));
  });

  it("magic generation can grant request by borrowing worker from another group", () => {
    const project: ProjectData = {
      schemaVersion: 1,
      project: {
        id: "magic-p",
        name: "Magic test",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      timeWindow: {
        year: 2026,
        startWeek: 1,
        endWeek: 1
      },
      groups: [
        {
          id: "ga",
          name: "Team A",
          minHeadcountPerWeek: 1
        },
        {
          id: "gb",
          name: "Team B",
          minHeadcountPerWeek: 1
        }
      ],
      skills: [{ id: "s1", name: "Skill 1" }],
      skillRequirements: [
        {
          id: "req-ga-s1",
          groupId: "ga",
          skillId: "s1",
          minPerWeek: 1
        }
      ],
      workers: [
        {
          id: "wa",
          name: "A skill",
          groupId: "ga",
          skillIds: ["s1"]
        },
        {
          id: "wb1",
          name: "B skill",
          groupId: "gb",
          skillIds: ["s1"]
        },
        {
          id: "wb2",
          name: "B general",
          groupId: "gb",
          skillIds: []
        }
      ],
      requests: [
        {
          id: "r1",
          workerId: "wa",
          startWeek: 1,
          endWeek: 1,
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

    const normal = generatePlan(structuredClone(project));
    expect(normal.plan.assignments.wa[1]).toBe("WORK");
    expect(normal.unmetRequests.length).toBeGreaterThan(0);

    const magic = generatePlanWithTransfers(structuredClone(project));
    expect(magic.plan.assignments.wa[1]).toBe("VACATION");
    expect(magic.plan.groupOverrides.wb1?.[1]).toBe("ga");
    expect(magic.unmetRequests).toHaveLength(0);
    expect(magic.violations).toHaveLength(0);
  });
});
