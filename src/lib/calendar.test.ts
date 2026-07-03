import { describe, expect, it } from "vitest";
import { buildMonthGrid, dateKey } from "./calendar";

describe("dateKey", () => {
  it("formats using local date components, zero-padded", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(dateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("buildMonthGrid", () => {
  it("always returns 6 full weeks (42 cells)", () => {
    expect(buildMonthGrid(2026, 6)).toHaveLength(42); // July 2026 starts on a Wednesday
    expect(buildMonthGrid(2026, 1)).toHaveLength(42); // February
  });

  it("starts the grid on the Sunday on/before the 1st of the month", () => {
    const grid = buildMonthGrid(2026, 6); // July 1, 2026 is a Wednesday
    expect(grid[0].date.getDay()).toBe(0);
    expect(dateKey(grid[0].date)).toBe("2026-06-28");
  });

  it("marks only days belonging to the requested month as inMonth", () => {
    const grid = buildMonthGrid(2026, 6);
    const inMonthDates = grid.filter((c) => c.inMonth).map((c) => c.date.getDate());
    expect(inMonthDates[0]).toBe(1);
    expect(inMonthDates[inMonthDates.length - 1]).toBe(31);
    expect(inMonthDates).toHaveLength(31);
    // Leading days before the 1st belong to the previous month.
    expect(grid[0].inMonth).toBe(false);
  });

  it("handles a December -> next January style month index correctly via Date rollover", () => {
    const grid = buildMonthGrid(2026, 11); // December
    const inMonthDates = grid.filter((c) => c.inMonth);
    expect(inMonthDates).toHaveLength(31);
    expect(inMonthDates.every((c) => c.date.getFullYear() === 2026)).toBe(true);
  });
});
