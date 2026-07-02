// Project location taxonomy (buildings / floors / units) and a per-task
// location picked from those lists. Shared types + small helpers used by the
// API (sanitizing input) and the UI (formatting for display).

export type ProjectLocations = {
  buildings: string[];
  floors: string[];
  units: string[];
};

export type TaskLocation = {
  building?: string;
  floor?: string;
  unit?: string;
};

export function emptyLocations(): ProjectLocations {
  return { buildings: [], floors: [], units: [] };
}

// Trim, drop empties, and de-duplicate a list of strings from untrusted input.
export function sanitizeStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      out.push(trimmed);
    }
  }
  return out;
}

export function sanitizeLocations(input: unknown): ProjectLocations {
  const obj = (input ?? {}) as Record<string, unknown>;
  return {
    buildings: sanitizeStringList(obj.buildings),
    floors: sanitizeStringList(obj.floors),
    units: sanitizeStringList(obj.units),
  };
}

// Normalize a task location, keeping only non-empty string parts.
export function sanitizeTaskLocation(input: unknown): TaskLocation | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as Record<string, unknown>;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  const location: TaskLocation = {
    building: pick(obj.building),
    floor: pick(obj.floor),
    unit: pick(obj.unit),
  };
  if (!location.building && !location.floor && !location.unit) return undefined;
  return location;
}

export function formatLocation(loc?: TaskLocation | null): string {
  if (!loc) return "";
  return [loc.building, loc.floor, loc.unit].filter(Boolean).join(" · ");
}
