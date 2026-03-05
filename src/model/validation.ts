import type { ProjectData } from "./types";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  value?: ProjectData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function validateProjectV1(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { valid: false, errors: ["JSON root must be an object."] };
  }

  if (input.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }

  const project = input.project;
  if (!isRecord(project)) {
    errors.push("project must be an object.");
  } else {
    if (!isString(project.id) || !project.id.trim()) {
      errors.push("project.id must be a non-empty string.");
    }
    if (!isString(project.name) || !project.name.trim()) {
      errors.push("project.name must be a non-empty string.");
    }
    if (!isString(project.createdAt)) {
      errors.push("project.createdAt must be a string.");
    }
    if (!isString(project.updatedAt)) {
      errors.push("project.updatedAt must be a string.");
    }
  }

  const timeWindow = input.timeWindow;
  if (!isRecord(timeWindow)) {
    errors.push("timeWindow must be an object.");
  } else {
    if (!isFiniteNumber(timeWindow.year)) {
      errors.push("timeWindow.year must be a number.");
    }
    if (!isFiniteNumber(timeWindow.startWeek)) {
      errors.push("timeWindow.startWeek must be a number.");
    }
    if (!isFiniteNumber(timeWindow.endWeek)) {
      errors.push("timeWindow.endWeek must be a number.");
    }
    if (
      timeWindow.includeMonths !== undefined &&
      (!Array.isArray(timeWindow.includeMonths) ||
        !timeWindow.includeMonths.every((month) => isFiniteNumber(month)))
    ) {
      errors.push("timeWindow.includeMonths must be an array of numbers.");
    }
  }

  const groups = input.groups;
  if (!Array.isArray(groups)) {
    errors.push("groups must be an array.");
  } else {
    groups.forEach((group, idx) => {
      if (!isRecord(group)) {
        errors.push(`groups[${idx}] must be an object.`);
        return;
      }
      if (!isString(group.id) || !group.id.trim()) {
        errors.push(`groups[${idx}].id must be a non-empty string.`);
      }
      if (!isString(group.name) || !group.name.trim()) {
        errors.push(`groups[${idx}].name must be a non-empty string.`);
      }
      if (!isFiniteNumber(group.minHeadcountPerWeek)) {
        errors.push(`groups[${idx}].minHeadcountPerWeek must be a number.`);
      }
    });
  }

  const skills = input.skills;
  if (!Array.isArray(skills)) {
    errors.push("skills must be an array.");
  } else {
    skills.forEach((skill, idx) => {
      if (!isRecord(skill)) {
        errors.push(`skills[${idx}] must be an object.`);
        return;
      }
      if (!isString(skill.id) || !skill.id.trim()) {
        errors.push(`skills[${idx}].id must be a non-empty string.`);
      }
      if (!isString(skill.name) || !skill.name.trim()) {
        errors.push(`skills[${idx}].name must be a non-empty string.`);
      }
    });
  }

  const requirements = input.skillRequirements;
  if (!Array.isArray(requirements)) {
    errors.push("skillRequirements must be an array.");
  } else {
    requirements.forEach((req, idx) => {
      if (!isRecord(req)) {
        errors.push(`skillRequirements[${idx}] must be an object.`);
        return;
      }
      if (!isString(req.id) || !req.id.trim()) {
        errors.push(`skillRequirements[${idx}].id must be a non-empty string.`);
      }
      if (!isString(req.groupId) || !req.groupId.trim()) {
        errors.push(`skillRequirements[${idx}].groupId must be a non-empty string.`);
      }
      if (!isString(req.skillId) || !req.skillId.trim()) {
        errors.push(`skillRequirements[${idx}].skillId must be a non-empty string.`);
      }
      if (!isFiniteNumber(req.minPerWeek)) {
        errors.push(`skillRequirements[${idx}].minPerWeek must be a number.`);
      }
    });
  }

  const workers = input.workers;
  if (!Array.isArray(workers)) {
    errors.push("workers must be an array.");
  } else {
    workers.forEach((worker, idx) => {
      if (!isRecord(worker)) {
        errors.push(`workers[${idx}] must be an object.`);
        return;
      }
      if (!isString(worker.id) || !worker.id.trim()) {
        errors.push(`workers[${idx}].id must be a non-empty string.`);
      }
      if (!isString(worker.name) || !worker.name.trim()) {
        errors.push(`workers[${idx}].name must be a non-empty string.`);
      }
      if (!isString(worker.groupId) || !worker.groupId.trim()) {
        errors.push(`workers[${idx}].groupId must be a non-empty string.`);
      }
      if (!isStringArray(worker.skillIds)) {
        errors.push(`workers[${idx}].skillIds must be an array of strings.`);
      }
    });
  }

  const requests = input.requests;
  if (!Array.isArray(requests)) {
    errors.push("requests must be an array.");
  } else {
    requests.forEach((request, idx) => {
      if (!isRecord(request)) {
        errors.push(`requests[${idx}] must be an object.`);
        return;
      }
      if (!isString(request.id) || !request.id.trim()) {
        errors.push(`requests[${idx}].id must be a non-empty string.`);
      }
      if (!isString(request.workerId) || !request.workerId.trim()) {
        errors.push(`requests[${idx}].workerId must be a non-empty string.`);
      }
      if (!isFiniteNumber(request.startWeek)) {
        errors.push(`requests[${idx}].startWeek must be a number.`);
      }
      if (!isFiniteNumber(request.endWeek)) {
        errors.push(`requests[${idx}].endWeek must be a number.`);
      }
      if (![1, 2, 3].includes(Number(request.priority))) {
        errors.push(`requests[${idx}].priority must be 1, 2, or 3.`);
      }
    });
  }

  const plan = input.plan;
  if (!isRecord(plan)) {
    errors.push("plan must be an object.");
  } else {
    if (!isRecord(plan.assignments)) {
      errors.push("plan.assignments must be an object.");
    }
    if (!isRecord(plan.groupOverrides)) {
      errors.push("plan.groupOverrides must be an object.");
    } else {
      for (const [workerId, weekMap] of Object.entries(plan.groupOverrides)) {
        if (!workerId.trim()) {
          errors.push("plan.groupOverrides has an empty worker id key.");
          continue;
        }
        if (!isRecord(weekMap)) {
          errors.push(`plan.groupOverrides.${workerId} must be an object.`);
          continue;
        }
        for (const [weekKey, groupId] of Object.entries(weekMap)) {
          if (!/^\d+$/.test(weekKey)) {
            errors.push(`plan.groupOverrides.${workerId}.${weekKey} week must be numeric.`);
          }
          if (!isString(groupId) || !groupId.trim()) {
            errors.push(`plan.groupOverrides.${workerId}.${weekKey} must be a non-empty group id.`);
          }
        }
      }
    }
    if (!isString(plan.generatedAt)) {
      errors.push("plan.generatedAt must be a string.");
    }
  }

  if (!Array.isArray(input.violations)) {
    errors.push("violations must be an array.");
  }
  if (!Array.isArray(input.unmetRequests)) {
    errors.push("unmetRequests must be an array.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    value: input as unknown as ProjectData
  };
}
