import { generatePlan } from "../engine/generatePlan";
import type { ProjectData, Skill, Worker } from "../model/types";
import { nowIso } from "../model/id";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickUnique<T>(items: T[], count: number, rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function isoWeekFromUtcDate(date: Date): number {
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function generateDemoProject(seed = 1337, year = 2026): ProjectData {
  const rng = mulberry32(seed);
  const now = nowIso();
  let idCounter = 1;
  const nextId = (prefix: string): string => `${prefix}-${seed}-${idCounter++}`;

  const groupSpecs = [
    { name: "Team A", workerCount: 50 },
    { name: "Team B", workerCount: 50 },
    { name: "Team C", workerCount: 50 },
    { name: "Team D", workerCount: 100 }
  ];
  const groups = groupSpecs.map((spec) => ({
    id: nextId("grp"),
    name: spec.name,
    minHeadcountPerWeek: Math.max(
      1,
      spec.workerCount - randomInt(rng, Math.ceil(spec.workerCount * 0.15), Math.ceil(spec.workerCount * 0.28))
    )
  }));

  const skills: Skill[] = Array.from({ length: 16 }, (_, idx) => ({
    id: nextId("skill"),
    name: `Skill ${idx + 1}`
  }));

  let workerIndex = 1;
  const workers: Worker[] = groups.flatMap((group, index) => {
    const count = groupSpecs[index].workerCount;
    return Array.from({ length: count }, () => {
      const skillCount = randomInt(rng, 1, 6);
      const worker: Worker = {
        id: nextId("wrk"),
        name: `Worker ${workerIndex}`,
        groupId: group.id,
        skillIds: pickUnique(skills.map((skill) => skill.id), skillCount, rng).sort()
      };
      workerIndex += 1;
      return worker;
    });
  });

  const skillRequirements = groups.flatMap((group) => {
    const requirementCount = randomInt(rng, 2, 4);
    const pickedSkills = pickUnique(skills, requirementCount, rng);
    const groupWorkerCount = workers.filter((worker) => worker.groupId === group.id).length;
    return pickedSkills.map((skill) => ({
      id: nextId("req"),
      groupId: group.id,
      skillId: skill.id,
      minPerWeek: randomInt(rng, Math.max(2, Math.floor(groupWorkerCount * 0.1)), Math.max(3, Math.floor(groupWorkerCount * 0.2)))
    }));
  });

  const aprilWeek = isoWeekFromUtcDate(new Date(Date.UTC(year, 3, 1)));
  const septemberWeek = isoWeekFromUtcDate(new Date(Date.UTC(year, 8, 30)));
  const vacationLength = 4;
  const requestStartMin = Math.max(1, Math.min(53 - vacationLength + 1, aprilWeek));
  const requestStartMax = Math.max(
    requestStartMin,
    Math.min(53 - vacationLength + 1, septemberWeek - vacationLength + 1)
  );

  const requests = workers.map((worker) => {
    const startWeek = randomInt(rng, requestStartMin, requestStartMax);
    return {
      id: nextId("reqv"),
      workerId: worker.id,
      startWeek,
      endWeek: startWeek + vacationLength - 1,
      priority: 2 as const
    };
  });

  const baseProject: ProjectData = {
    schemaVersion: 1,
    project: {
      id: `demo-${seed}`,
      name: "Demo 250 workers",
      createdAt: now,
      updatedAt: now
    },
    timeWindow: {
      year,
      startWeek: requestStartMin,
      endWeek: septemberWeek,
      includeMonths: [4, 5, 6, 7, 8, 9]
    },
    groups,
    skills,
    skillRequirements,
    workers,
    requests,
    plan: {
      assignments: {},
      groupOverrides: {},
      generatedAt: now
    },
    violations: [],
    unmetRequests: []
  };

  const generated = generatePlan(baseProject);
  return {
    ...baseProject,
    plan: generated.plan,
    violations: generated.violations,
    unmetRequests: generated.unmetRequests
  };
}
