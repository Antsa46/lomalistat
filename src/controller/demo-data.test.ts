import { generateDemoProject } from "./demo-data";

function isoWeekFromUtcDate(date: Date): number {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

describe("generateDemoProject", () => {
  it("creates 4 groups with 50/50/50/100 workers and one 4-week request per worker in Apr-Sep", () => {
    const year = 2026;
    const project = generateDemoProject(1337, year);

    expect(project.groups).toHaveLength(4);
    expect(project.workers).toHaveLength(250);
    expect(project.requests).toHaveLength(250);

    const countsByGroup = project.groups.map(
      (group) => project.workers.filter((worker) => worker.groupId === group.id).length
    );
    expect(countsByGroup).toEqual([50, 50, 50, 100]);

    const aprilWeek = isoWeekFromUtcDate(new Date(Date.UTC(year, 3, 1)));
    const septemberWeek = isoWeekFromUtcDate(new Date(Date.UTC(year, 8, 30)));
    const maxStart = septemberWeek - 4 + 1;

    expect(project.timeWindow.startWeek).toBe(aprilWeek);
    expect(project.timeWindow.endWeek).toBe(septemberWeek);
    expect(project.timeWindow.includeMonths).toEqual([4, 5, 6, 7, 8, 9]);

    for (const request of project.requests) {
      expect(request.endWeek - request.startWeek + 1).toBe(4);
      expect(request.startWeek).toBeGreaterThanOrEqual(aprilWeek);
      expect(request.startWeek).toBeLessThanOrEqual(maxStart);
      expect(request.priority).toBe(2);
    }
  });
});
