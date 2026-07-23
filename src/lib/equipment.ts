// Pure helpers for equipment scheduling & double-booking detection. Kept free
// of the DB so the same logic runs in the board UI (to flag conflicts) and in
// the alert scan (to raise them).

export type EquipmentBooking = {
  id: string;
  name: string;
  projectId: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
};

export type EquipmentConflict = {
  name: string;
  ids: string[];
  projectIds: string[];
};

function toTime(value: string | Date | null | undefined, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? fallback : t;
}

// Two date ranges overlap when each starts on or before the other ends. A
// missing start is treated as -infinity and a missing end as +infinity (an
// open-ended booking).
export function rangesOverlap(
  aStart: string | Date | null | undefined,
  aEnd: string | Date | null | undefined,
  bStart: string | Date | null | undefined,
  bEnd: string | Date | null | undefined,
): boolean {
  const as = toTime(aStart, -Infinity);
  const ae = toTime(aEnd, Infinity);
  const bs = toTime(bStart, -Infinity);
  const be = toTime(bEnd, Infinity);
  return as <= be && bs <= ae;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// Find machines that are double-booked: same machine (by normalized name),
// overlapping dates, but assigned to *different* projects at once. Returns one
// entry per conflicting machine, listing every booking id involved.
export function findEquipmentConflicts(bookings: EquipmentBooking[]): EquipmentConflict[] {
  const byName = new Map<string, { display: string; items: EquipmentBooking[] }>();
  for (const b of bookings) {
    if (!b.name?.trim()) continue;
    const key = normalizeName(b.name);
    const group = byName.get(key) ?? { display: b.name.trim(), items: [] };
    group.items.push(b);
    byName.set(key, group);
  }

  const conflicts: EquipmentConflict[] = [];
  for (const { display, items } of byName.values()) {
    if (items.length < 2) continue;

    const conflictingIds = new Set<string>();
    const projectIds = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (a.projectId === b.projectId) continue; // same site — not a conflict
        if (rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
          conflictingIds.add(a.id);
          conflictingIds.add(b.id);
          projectIds.add(a.projectId);
          projectIds.add(b.projectId);
        }
      }
    }

    if (conflictingIds.size > 0) {
      conflicts.push({ name: display, ids: [...conflictingIds], projectIds: [...projectIds] });
    }
  }

  return conflicts;
}
