let seq = 0;

export function createId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

