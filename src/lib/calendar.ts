// Pure month-grid helpers for the calendar view. Kept dependency-free so
// they're easy to unit test; all dates are handled in local time (not UTC)
// to match how a person reads a wall calendar.

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type MonthGridCell = { date: Date; inMonth: boolean };

// Always 6 weeks (42 cells) starting on Sunday, so the grid has a stable
// height regardless of which weekday the month starts/ends on.
export function buildMonthGrid(year: number, month: number): MonthGridCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return { date, inMonth: date.getMonth() === month };
  });
}
