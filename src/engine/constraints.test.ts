import { buildDefaultAssignments, computeViolations } from "./constraints";
import { createFixtureProject } from "../test/fixtureProject";
import type { ProjectData } from "../model/types";

describe("constraints", () => {
  it("computes headcount and skill violations", () => {
    const project = createFixtureProject();
    const assignments = buildDefaultAssignments(project);

    expect(computeViolations(project, assignments)).toHaveLength(0);

    assignments.w1[1] = "VACATION";
    assignments.w3[1] = "VACATION";

    const violations = computeViolations(project, assignments);
    const headcount = violations.find((item) => item.type === "HEADCOUNT" && item.week === 1);
    const skill = violations.find((item) => item.type === "SKILL" && item.week === 1);

    expect(headcount).toBeDefined();
    expect(headcount?.required).toBe(2);
    expect(headcount?.actual).toBe(1);
    expect(headcount?.missing).toBe(1);

    expect(skill).toBeDefined();
    expect(skill?.required).toBe(1);
    expect(skill?.actual).toBe(0);
    expect(skill?.missing).toBe(1);
  });

  it("applies added skill requirements to weekly checks", () => {
    const project = createFixtureProject();
    project.skillRequirements = [];
    const assignments = buildDefaultAssignments(project);

    expect(computeViolations(project, assignments).some((item) => item.type === "SKILL")).toBe(false);

    project.skillRequirements.push({
      id: "sr-added",
      groupId: "g1",
      skillId: "s1",
      minPerWeek: 3
    });

    const violations = computeViolations(project, assignments);
    const skillViolations = violations.filter((item) => item.type === "SKILL");
    expect(skillViolations.length).toBeGreaterThan(0);
    expect(skillViolations.every((item) => item.required === 3)).toBe(true);
  });

  it("counts worker in overridden target group for a week", () => {
    const project: ProjectData = {
      schemaVersion: 1,
      project: {
        id: "p-override",
        name: "Override",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      timeWindow: { year: 2026, startWeek: 1, endWeek: 1 },
      groups: [
        { id: "g1", name: "Team A", minHeadcountPerWeek: 1 },
        { id: "g2", name: "Team B", minHeadcountPerWeek: 1 }
      ],
      skills: [{ id: "s1", name: "Skill 1" }],
      skillRequirements: [
        { id: "sr-b", groupId: "g2", skillId: "s1", minPerWeek: 1 }
      ],
      workers: [
        { id: "w1", name: "A1", groupId: "g1", skillIds: ["s1"] },
        { id: "w2", name: "A2", groupId: "g1", skillIds: [] },
        { id: "w3", name: "B1", groupId: "g2", skillIds: [] }
      ],
      requests: [],
      plan: {
        assignments: {
          w1: { 1: "WORK" },
          w2: { 1: "WORK" },
          w3: { 1: "VACATION" }
        },
        groupOverrides: {},
        generatedAt: "2026-01-01T00:00:00.000Z"
      },
      violations: [],
      unmetRequests: []
    };

    const before = computeViolations(project, project.plan.assignments, project.plan.groupOverrides);
    expect(before.some((item) => item.groupId === "g2" && item.type === "HEADCOUNT")).toBe(true);
    expect(before.some((item) => item.groupId === "g2" && item.type === "SKILL")).toBe(true);

    const overrides = {
      w1: { 1: "g2" }
    };
    const after = computeViolations(project, project.plan.assignments, overrides);
    expect(after.some((item) => item.groupId === "g2")).toBe(false);
  });
});
